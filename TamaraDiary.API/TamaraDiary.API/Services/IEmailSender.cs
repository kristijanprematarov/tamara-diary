using TamaraDiary.API.Models;
using System.Threading.Tasks;

namespace TamaraDiary.API.Services;

public interface IEmailSender
{
    /// <summary>
    /// Send notification(s) related to a newly created order. Implementations should send
    /// at least an admin notification and optionally a customer confirmation.
    /// Errors should be thrown to allow callers to log them, but should not prevent order creation.
    /// </summary>
    /// <summary>
    /// Send notification(s) related to a newly created order. Implementations should send
    /// at least an admin notification and optionally a customer confirmation. The optional
    /// language parameter ("mk" or "en") can be used to choose a localized template.
    /// </summary>
    Task SendOrderCreatedEmailAsync(TrackedOrder order, string? language = null);
    /// <summary>
    /// Notify customer (and optionally log) about a status change for an order.
    /// Implementations should send a customer-facing email describing the new status.
    /// </summary>
    Task SendOrderStatusChangedEmailAsync(TrackedOrder order, OrderStatus previousStatus, string? language = null);
}
