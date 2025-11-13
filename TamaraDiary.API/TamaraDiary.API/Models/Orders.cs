namespace TamaraDiary.API.Models;

public enum OrderStatus { Created = 0, Accepted = 1, InProgress = 2, Packaging = 3, Delivering = 4, Delivered = 5, Rejected = 6 }

public record UploadedFile(string Name, string ContentType, long Size, string DataUrl);

public record StatusLog
{
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;
    public string Event { get; init; } = string.Empty; // Created, StatusChanged, Rejected, EtaUpdated
    public OrderStatus? NewStatus { get; init; }
    public string? Note { get; init; }
    // Optional parameters to be used when the Note is a localization key that requires formatting
    public Dictionary<string, object?>? NoteParams { get; init; }
    public string? By { get; init; }
}

public record TrackedOrder
{
    public string Code { get; init; } = string.Empty;
    public DateTime CreatedUtc { get; init; } = DateTime.UtcNow;
    // Customer identity - use structured first/last name and address
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    // Delivery address (single-line / freeform). Required for delivery.
    public string? Address { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Instagram { get; init; }
    public string? ProductId { get; init; }
    public string? ProductTitle { get; init; }
    public string? ProductImage { get; init; }
    public bool IsCustomPortrait { get; init; } = false;
    public int Quantity { get; init; } = 1;
    public string? Notes { get; init; }
    public List<string> UploadedFileNames { get; init; } = new();
    public List<UploadedFile> UploadedFiles { get; init; } = new();
    // IDs of selected TamaraDiary cards (if included in this order)
    public List<string> SelectedCardIds { get; init; } = new();
    // Optional preview info for selected cards (id, localized title key or text, image path)
    public List<SelectedCardPreview> SelectedCards { get; init; } = new();
    public OrderStatus Status { get; set; } = OrderStatus.Created;
    public string? RejectionReason { get; set; }
    public DateTime? EstimatedDeliveryUtc { get; set; }
    public DateTime? EstimatedDeliveryStartUtc { get; set; }
    public DateTime? EstimatedDeliveryEndUtc { get; set; }
    public List<StatusLog> Logs { get; set; } = new();
    // Optional language code (e.g. "mk" or "en"). When provided the API will
    // attempt to send customer-facing emails in the requested language.
    public string? Language { get; init; }
}

public record SelectedCardPreview
{
    public string Id { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string? Image { get; init; }
}
