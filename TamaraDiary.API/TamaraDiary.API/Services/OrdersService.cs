using TamaraDiary.API.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace TamaraDiary.API.Services;

public interface IOrdersService
{
    TrackedOrder? Get(string code);
    IEnumerable<TrackedOrder> List(int max = 50);
    Task<TrackedOrder> Create(TrackedOrder order);
    void AddFiles(string code, IEnumerable<UploadedFile> files);
    Task UpdateStatusAsync(string code, OrderStatus status, string? note, string? by);
    void UpdateEta(string code, DateTime? startUtc, DateTime? endUtc, string? by);
}

public class OrdersService : IOrdersService
{
    private static readonly Dictionary<string, TrackedOrder> _orders = new();
    private readonly IEmailSender _emailSender;
    private readonly ILogger<OrdersService> _logger;

    public OrdersService(IEmailSender emailSender, ILogger<OrdersService> logger)
    {
        _emailSender = emailSender;
        _logger = logger;
    }

    public TrackedOrder? Get(string code) => _orders.TryGetValue(code, out var o) ? o : null;

    public IEnumerable<TrackedOrder> List(int max = 50)
        => _orders.Values.OrderByDescending(o => o.CreatedUtc).Take(Math.Clamp(max, 1, 500));

    public async Task<TrackedOrder> Create(TrackedOrder order)
    {
        // Basic validation - ensure required fields and business rules are met
        if (string.IsNullOrWhiteSpace(order.Code)) throw new ArgumentException("Missing order code");
        // Require explicit FirstName + LastName
        if (string.IsNullOrWhiteSpace(order.FirstName) || string.IsNullOrWhiteSpace(order.LastName))
            throw new ArgumentException("Missing customer first name or last name");
        if (string.IsNullOrWhiteSpace(order.Email) || !order.Email.Contains('@')) throw new ArgumentException("Invalid email");
    if (string.IsNullOrWhiteSpace(order.Address)) throw new ArgumentException("Missing delivery address");
    // Require phone for order processing
    if (string.IsNullOrWhiteSpace(order.Phone)) throw new ArgumentException("Missing phone number");
        if (order.Quantity < 1) throw new ArgumentException("Quantity must be at least 1");
        // Custom portrait requires at least one uploaded file (reference photo)
        if (order.IsCustomPortrait && (order.UploadedFiles == null || order.UploadedFiles.Count == 0))
            throw new ArgumentException("Custom portrait orders require at least one reference photo");
        // If selected cards are provided, enforce minimum selection (3)
        if (order.SelectedCardIds != null && order.SelectedCardIds.Count > 0 && order.SelectedCardIds.Count < 3)
            throw new ArgumentException("At least 3 selected cards are required for TamaraDiary card orders");

    // Use combined first+last name for logs
    var combinedName = $"{order.FirstName} {order.LastName}".Trim();
    var created = order with { CreatedUtc = DateTime.UtcNow, Status = OrderStatus.Created };
    created.Logs.Add(new StatusLog { Event = "Created", NewStatus = created.Status, By = combinedName });
        // If this is a custom portrait order we may later create a storage container/folder
        // for the tracking code and store photos there (e.g., Azure Blob Storage). For now just record intent.
        if (created.IsCustomPortrait)
        {
            // record a localization key rather than a literal note so the frontend can translate it
            created.Logs.Add(new StatusLog { Event = "CustomPortraitOrder", Note = "status.customPortraitOrder.note", By = combinedName });
        }
        if (created.SelectedCardIds?.Count > 0)
        {
            // Use a translation key as the note so the frontend can localize it (similar to custom portrait note)
            // Provide the selected cards count as parameter `n` so clients that support parameterized translations
            // can interpolate the value (e.g., "order.selectedCards" -> "Selected cards: {{n}}").
            created.Logs.Add(new StatusLog
            {
                Event = "SelectedCards",
                Note = "order.selectedCards",
                NoteParams = new Dictionary<string, object?> { ["n"] = created.SelectedCardIds.Count },
                By = combinedName
            });
        }

        _orders[created.Code] = created;

        // Send notification emails (fire and forget but await to capture errors)
        try
        {
            // Use requested language if provided on the order, otherwise default to mk (frontend default)
            var lang = created.Language ?? "mk";
            await _emailSender.SendOrderCreatedEmailAsync(created, lang);
            _logger.LogInformation("Order {Code}: notification emails attempted", created.Code);
        }
        catch (Exception ex)
        {
            // Log but do not fail order creation
            _logger.LogError(ex, "Failed to send order notifications for {Code}", created.Code);
        }

        return created;
    }

    public void AddFiles(string code, IEnumerable<UploadedFile> files)
    {
        if (!_orders.TryGetValue(code, out var o)) throw new KeyNotFoundException();
        foreach (var f in files)
        {
            // `UploadedFiles` and `UploadedFileNames` are init-only properties initialized to lists;
            // append to the existing lists rather than assigning a new list.
            o.UploadedFiles.Add(f);
            o.UploadedFileNames.Add(f.Name);
        }
        o.Logs.Add(new StatusLog { Event = "FilesAdded", Note = $"{files.Count()} files added", By = "admin" });
        _orders[code] = o;
    }

    public async Task UpdateStatusAsync(string code, OrderStatus status, string? note, string? by)
    {
        if (!_orders.TryGetValue(code, out var o)) throw new KeyNotFoundException();
        var previous = o.Status;
        // Validate rejection requires a reason
        if (status == OrderStatus.Rejected && string.IsNullOrWhiteSpace(note))
            throw new ArgumentException("A reason is required when rejecting an order");

        o.Status = status;
        if (status == OrderStatus.Rejected) o.RejectionReason = note;
        o.Logs.Add(new StatusLog { Event = status == OrderStatus.Rejected ? "Rejected" : "StatusChanged", NewStatus = status, Note = note, By = by });
        _orders[code] = o;

        // Notify customer about status change (do not let notification failures break the update)
        try
        {
            var lang = o.Language ?? "mk";
            await _emailSender.SendOrderStatusChangedEmailAsync(o, previous, lang);
            _logger.LogInformation("Order {Code}: status change email attempted", code);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send status change notification for {Code}", code);
        }
    }

    public void UpdateEta(string code, DateTime? startUtc, DateTime? endUtc, string? by)
    {
        if (!_orders.TryGetValue(code, out var o)) throw new KeyNotFoundException();
        var changed = o.EstimatedDeliveryStartUtc != startUtc || o.EstimatedDeliveryEndUtc != endUtc;
        if (!changed) return;
        o.EstimatedDeliveryStartUtc = startUtc;
        o.EstimatedDeliveryEndUtc = endUtc;
        o.EstimatedDeliveryUtc = endUtc is null ? startUtc : null;
        o.Logs.Add(new StatusLog { Event = "EtaUpdated", Note = FormatEtaNote(startUtc, endUtc), By = by });
        _orders[code] = o;
    }

    private static string? FormatEtaNote(DateTime? startUtc, DateTime? endUtc)
    {
        static string F(DateTime d) => d.ToString("yyyy-MM-dd");
        if (startUtc is DateTime s && endUtc is DateTime e) return $"{F(s)}..{F(e)}";
        if (startUtc is DateTime s1) return F(s1);
        return null;
    }
}
