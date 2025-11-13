using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using TamaraDiary.API.Models;
using System.Threading.Tasks;
using System.Linq;

namespace TamaraDiary.API.Services;

public class StubEmailSender : IEmailSender
{
    private readonly ILogger<StubEmailSender> _logger;
    private readonly IConfiguration _config;

    public StubEmailSender(ILogger<StubEmailSender> logger, IConfiguration config)
    {
        _logger = logger;
        _config = config;
    }

    public Task SendOrderCreatedEmailAsync(TrackedOrder order, string? language = null)
    {
        // Log what would be sent. Useful for development.
        var admin = _config["Email:NotifyTo"] ?? _config["Email:To"] ?? "(not configured)";
    var subject = $"New order {order.Code} from {order.FirstName} {order.LastName} <{order.Email}>";
        _logger.LogInformation("[StubEmail] New order {Code} -> Admin: {AdminRecipients}", order.Code, admin);
        _logger.LogInformation("[StubEmail] Customer confirmation -> {Customer}", order.Email);
        _logger.LogInformation("[StubEmail] Subject: {Subject}", subject);
        // Build a language-aware body for the customer when possible
        var lang = (language ?? order.Language ?? "mk").ToLowerInvariant();
        var body = lang == "mk" ? BuildPlainTextMk(order) : BuildPlainText(order);
        var adminUrl = _config["Email:AdminUrl"];
        if (!string.IsNullOrWhiteSpace(adminUrl)) body += System.Environment.NewLine + $"Admin panel: {adminUrl}?order={order.Code}";
        _logger.LogInformation("[StubEmail] Body:\n{Body}", body);
        return Task.CompletedTask;
    }

    public Task SendOrderStatusChangedEmailAsync(TrackedOrder order, OrderStatus previousStatus, string? language = null)
    {
        var admin = _config["Email:NotifyTo"] ?? _config["Email:To"] ?? "(not configured)";
        var subject = $"Order {order.Code} status changed to {order.Status}";
        _logger.LogInformation("[StubEmail] Status change for {Code} -> {Status}. Notify admin: {AdminRecipients}", order.Code, order.Status, admin);
        _logger.LogInformation("[StubEmail] Customer notification -> {Customer}", order.Email);
        _logger.LogInformation("[StubEmail] Subject: {Subject}", subject);
        var lang = (order.Language ?? "mk").ToLowerInvariant();
        var body = lang == "mk" ? BuildPlainTextMk(order) : BuildPlainText(order);
        _logger.LogInformation("[StubEmail] Body: {Body}", body);
        return Task.CompletedTask;
    }

    private static string BuildPlainText(TrackedOrder o)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Order code: {o.Code}");
        sb.AppendLine();
    sb.AppendLine($"Name: {o.FirstName} {o.LastName}");
        sb.AppendLine($"Email: {o.Email}");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"Phone: {o.Phone}");
        if (!string.IsNullOrWhiteSpace(o.Instagram)) sb.AppendLine($"Instagram: {o.Instagram}");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"Item: {o.ProductTitle}");
        sb.AppendLine($"Quantity: {o.Quantity}");
        if (!string.IsNullOrWhiteSpace(o.Notes))
        {
            sb.AppendLine();
            sb.AppendLine("Notes:");
            sb.AppendLine(o.Notes);
        }
        if (o.UploadedFileNames?.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Uploaded files:");
            foreach (var f in o.UploadedFileNames) sb.AppendLine($"- {f}");
        }
        if (o.SelectedCards?.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Selected cards:");
            foreach (var c in o.SelectedCards) sb.AppendLine($"- {c.Title ?? c.Id}");
        }
        return sb.ToString();
    }

    private static string BuildPlainTextMk(TrackedOrder o)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Код на нарачка: {o.Code}");
        sb.AppendLine();
        var name = $"{o.FirstName} {o.LastName}".Trim();
        sb.AppendLine($"Име: {name}");
        sb.AppendLine($"Е-пошта: {o.Email}");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"Телефон: {o.Phone}");
        if (!string.IsNullOrWhiteSpace(o.Address)) sb.AppendLine($"Адреса: {o.Address}");
        if (!string.IsNullOrWhiteSpace(o.Instagram)) sb.AppendLine($"Instagram: {o.Instagram}");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"Артикл: {o.ProductTitle}");
        sb.AppendLine($"Количина: {o.Quantity}");
        if (!string.IsNullOrWhiteSpace(o.Notes))
        {
            sb.AppendLine();
            sb.AppendLine("Белешки:");
            sb.AppendLine(o.Notes);
        }
        if (o.UploadedFileNames?.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Пратени фајлови:");
            foreach (var f in o.UploadedFileNames) sb.AppendLine($"- {f}");
        }
        if (o.SelectedCards?.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Избрани картички:");
            foreach (var c in o.SelectedCards) sb.AppendLine($"- {c.Title ?? c.Id}");
        }
        sb.AppendLine();
        sb.AppendLine("Плаќање: Плаќање при достава (готовина)");
        sb.AppendLine("Тамара ќе ве извести за очекуваниот датум на испорака.");
        sb.AppendLine();
        sb.AppendLine($"За да ја пронајдете нарачката подоцна користете го кодот: {o.Code}");
        return sb.ToString();
    }
}
