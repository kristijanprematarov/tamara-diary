using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using Azure.Core;
using TamaraDiary.API.Models;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace TamaraDiary.API.Services;

public class AzureCommunicationEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<AzureCommunicationEmailSender> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly string? _logoDataUrl;

    public AzureCommunicationEmailSender(IConfiguration config, ILogger<AzureCommunicationEmailSender> logger, IWebHostEnvironment env)
    {
        _config = config;
        _logger = logger;
        _env = env;
        // Prefer an explicitly configured public logo URL (more reliable across email clients).
        var configuredLogoUrl = _config["Email:LogoUrl"];
        if (!string.IsNullOrWhiteSpace(configuredLogoUrl))
        {
            _logoDataUrl = configuredLogoUrl; // this may be an absolute https:// URL
            return;
        }
        try
        {
            // Try to load a brand logo (tamara.jpg) from the API wwwroot gallery folder and convert to a base64 data URL
            var candidate = Path.Combine(_env.ContentRootPath ?? string.Empty, "wwwroot", "gallery", "tamara.jpg");
            if (File.Exists(candidate))
            {
                var bytes = File.ReadAllBytes(candidate);
                var b64 = Convert.ToBase64String(bytes);
                _logoDataUrl = $"data:image/jpeg;base64,{b64}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to load embedded logo for emails");
            _logoDataUrl = null;
        }
    }

    public async Task SendOrderStatusChangedEmailAsync(TrackedOrder order, OrderStatus previousStatus, string? language = null)
    {
        var connectionString = _config["Email:ConnectionString"];
        var fromAddress = _config["Email:From"];
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(fromAddress))
            throw new InvalidOperationException("Email:ConnectionString or Email:From not configured");

        var client = new EmailClient(connectionString);

        // Determine language and labels
        var lang = (language ?? order.Language ?? "mk").ToLowerInvariant();
        var newLabel = StatusLabel(order.Status, lang);
        var prevLabel = StatusLabel(previousStatus, lang);

        // 1) Customer notification — richer content: include previous status, rejection reason and track link
        if (!string.IsNullOrWhiteSpace(order.Email))
        {
            var subject = lang == "mk" ? $"Ажурирање за нарачка {order.Code}" : $"Update on your TamaraDiary order {order.Code}";
            var baseHtml = lang == "mk" ? BuildCustomerHtmlMk(order) : BuildCustomerHtml(order);
            var statusHtml = lang == "mk"
                ? $"<p><strong>Статус:</strong> {System.Net.WebUtility.HtmlEncode(newLabel)} (претходно: {System.Net.WebUtility.HtmlEncode(prevLabel)})</p>"
                : $"<p><strong>Status:</strong> {System.Net.WebUtility.HtmlEncode(newLabel)} (previous: {System.Net.WebUtility.HtmlEncode(prevLabel)})</p>";

            var html = baseHtml + statusHtml;
            if (!string.IsNullOrWhiteSpace(order.RejectionReason) && order.Status == OrderStatus.Rejected)
            {
                html += lang == "mk"
                    ? $"<p><strong>Причина за откажување:</strong> {System.Net.WebUtility.HtmlEncode(order.RejectionReason)}</p>"
                    : $"<p><strong>Reason for rejection:</strong> {System.Net.WebUtility.HtmlEncode(order.RejectionReason)}</p>";
            }
            var trackUrl = _config["Email:TrackUrl"] ?? _config["Email:AdminUrl"];
            if (!string.IsNullOrWhiteSpace(trackUrl))
            {
                var encoded = System.Net.WebUtility.HtmlEncode(trackUrl);
                html += $"<p>View your order: <a href=\"{encoded}?order={System.Net.WebUtility.HtmlEncode(order.Code)}\">{encoded}?order={System.Net.WebUtility.HtmlEncode(order.Code)}</a></p>";
            }

            var content = new EmailContent(subject) { Html = html, PlainText = (lang == "mk" ? BuildPlainTextMk(order) : BuildPlainText(order)) };
            var recipients = new EmailRecipients(new[] { new EmailAddress(order.Email) }.ToList());
            var message = new EmailMessage(fromAddress, recipients, content);

            try
            {
                var response = await client.SendAsync(Azure.WaitUntil.Completed, message);
                _logger.LogInformation("ACS status-change email sent for {Code} to {Email}. Status={Status}", order.Code, order.Email, response.Value?.Status);
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "ACS status-change email failed for {Code} to {Email}", order.Code, order.Email);
                // Do not rethrow: avoid breaking status update on transient email failures
            }
        }

        // 2) Admin notification (concise) — notify admin list about status change so Tamara can act
        try
        {
            var adminRecipients = _config["Email:NotifyTo"] ?? _config["Email:To"];
            var ensureAdmins = new[] { "tamaramiteva88@gmail.com", "kristijanprematarov@gmail.com" };
            var admins = new List<string>();
            if (!string.IsNullOrWhiteSpace(adminRecipients))
            {
                admins.AddRange(adminRecipients.Split(',').Select(s => s.Trim()).Where(s => !string.IsNullOrEmpty(s)));
            }
            foreach (var ea in ensureAdmins)
            {
                if (!admins.Contains(ea, StringComparer.OrdinalIgnoreCase)) admins.Add(ea);
            }
            if (admins.Count > 0)
            {
                var subjectAdmin = lang == "mk" ? $"Ажурирање статус на нарачка {order.Code}" : $"Order status updated: {order.Code}";
                var adminHtml = new System.Text.StringBuilder();
                if (!string.IsNullOrWhiteSpace(_logoDataUrl)) adminHtml.AppendLine($"<div style=\"margin-bottom:12px\"><img src=\"{_logoDataUrl}\" alt=\"TamaraDiary\" style=\"height:48px;\"/></div>");
                adminHtml.AppendLine($"<p><strong>Order:</strong> {System.Net.WebUtility.HtmlEncode(order.Code)}</p>");
                adminHtml.AppendLine($"<p><strong>Status:</strong> {System.Net.WebUtility.HtmlEncode(newLabel)} (previous: {System.Net.WebUtility.HtmlEncode(prevLabel)})</p>");
                if (!string.IsNullOrWhiteSpace(order.RejectionReason) && order.Status == OrderStatus.Rejected)
                {
                    adminHtml.AppendLine($"<p><strong>Rejection reason:</strong> {System.Net.WebUtility.HtmlEncode(order.RejectionReason)}</p>");
                }
                if (!string.IsNullOrWhiteSpace(order.FirstName) || !string.IsNullOrWhiteSpace(order.LastName))
                {
                    var name = System.Net.WebUtility.HtmlEncode(((order.FirstName ?? string.Empty) + " " + (order.LastName ?? string.Empty)).Trim());
                    adminHtml.AppendLine($"<p><strong>Customer:</strong> {name}</p>");
                }
                if (!string.IsNullOrWhiteSpace(_config["Email:AdminUrl"])) adminHtml.AppendLine($"<p><a href=\"{System.Net.WebUtility.HtmlEncode(_config["Email:AdminUrl"])}?order={System.Net.WebUtility.HtmlEncode(order.Code)}\">Open in admin panel</a></p>");

                var adminContent = new EmailContent(subjectAdmin) { Html = adminHtml.ToString(), PlainText = BuildPlainText(order) };
                var adminRecipientsList = new EmailRecipients(admins.Select(a => new EmailAddress(a)).ToList());
                var adminMessage = new EmailMessage(fromAddress, adminRecipientsList, adminContent);
                await client.SendAsync(Azure.WaitUntil.Completed, adminMessage);
                _logger.LogInformation("ACS admin status-change email sent for {Code}", order.Code);
            }
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "ACS admin status-change email failed for {Code}", order.Code);
        }
    }

    private static string StatusLabel(OrderStatus s, string lang)
    {
        if (lang == "mk")
        {
            return s switch
            {
                OrderStatus.Accepted => "Прифатена",
                OrderStatus.Created => "Креирана",
                OrderStatus.InProgress => "Во обработка",
                OrderStatus.Packaging => "Пакувањето",
                OrderStatus.Delivering => "Во достава",
                OrderStatus.Delivered => "Доставена",
                OrderStatus.Rejected => "Откажена",
                _ => s.ToString()
            };
        }
        return s switch
        {
            OrderStatus.Accepted => "Accepted",
            OrderStatus.Created => "Created",
            OrderStatus.InProgress => "In progress",
            OrderStatus.Packaging => "Packaging",
            OrderStatus.Delivering => "Out for delivery",
            OrderStatus.Delivered => "Delivered",
            OrderStatus.Rejected => "Rejected",
            _ => s.ToString()
        };
    }

    public async Task SendOrderCreatedEmailAsync(TrackedOrder order, string? language = null)
    {
        var connectionString = _config["Email:ConnectionString"];
        var fromAddress = _config["Email:From"];
    var adminRecipients = _config["Email:NotifyTo"] ?? _config["Email:To"];
    // Ensure Tamara and Kristijan are notified for admin emails by default
    var ensureAdmins = new[] { "tamaramiteva88@gmail.com", "kristijanprematarov@gmail.com" };

        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(fromAddress))
            throw new InvalidOperationException("Email:ConnectionString or Email:From not configured");

        var client = new EmailClient(connectionString);

    var lang = (language ?? order.Language ?? "mk").ToLowerInvariant();

    // Admin notification
        var admins = new List<string>();
        if (!string.IsNullOrWhiteSpace(adminRecipients))
        {
            admins.AddRange(adminRecipients.Split(',').Select(s => s.Trim()).Where(s => !string.IsNullOrEmpty(s)));
        }
        // Ensure required emails are present (avoid duplicates)
        foreach (var ea in ensureAdmins)
        {
            if (!admins.Contains(ea, StringComparer.OrdinalIgnoreCase)) admins.Add(ea);
        }
        if (admins.Count > 0)
        {
                // Minimal subject and html for admin: we avoid including personal details in the notification
                var subject = $"New order {order.Code}";
                var html = BuildAdminHtml(order);
                // include admin panel URL if configured
                var adminUrl = _config["Email:AdminUrl"];
                if (!string.IsNullOrWhiteSpace(adminUrl))
                {
                    // append admin link to html
                    html += $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(adminUrl)}?order={System.Net.WebUtility.HtmlEncode(order.Code)}\">Open in admin panel</a></p>";
                }

                // For admin notifications include the order details in plain text as well (so Tamara sees phone/address without opening admin panel)
                var plain = BuildPlainText(order);
                if (!string.IsNullOrWhiteSpace(adminUrl))
                {
                    plain += System.Environment.NewLine + $"Admin panel: {adminUrl}?order={order.Code}";
                }

                var content = new EmailContent(subject) { Html = html, PlainText = plain };
                var recipients = new EmailRecipients(admins.Select(a => new EmailAddress(a)).ToList());
                var message = new EmailMessage(fromAddress, recipients, content);

                // Build attachments: include uploaded files (if any) and the brand logo as attachments so admin can download
                var attachments = new List<EmailAttachment>();
                try
                {
                    // Do NOT attach the brand logo as an attachment. The logo is embedded in the HTML only.
                    if (order.UploadedFiles != null)
                    {
                        foreach (var f in order.UploadedFiles)
                        {
                            // f.DataUrl expected in the form data:<mime>;base64,<b64>
                            if (string.IsNullOrWhiteSpace(f.DataUrl)) continue;
                            var idx = f.DataUrl.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
                            if (idx > -1)
                            {
                                var b64 = f.DataUrl.Substring(idx + 7);
                                var name = string.IsNullOrWhiteSpace(f.Name) ? "upload" : f.Name;
                                var bytes = Convert.FromBase64String(b64);
                                attachments.Add(new EmailAttachment(name, f.ContentType ?? "application/octet-stream", BinaryData.FromBytes(bytes)));
                            }
                        }
                    }
                    // If no uploaded files present, try to attach selected gallery images by reading from wwwroot
                    if (attachments.Count == 0 && order.SelectedCards != null && order.SelectedCards.Count > 0)
                    {
                        foreach (var sc in order.SelectedCards)
                        {
                            try
                            {
                                var imgPath = sc.Image ?? string.Empty;
                                if (string.IsNullOrWhiteSpace(imgPath)) continue;
                                // Normalize and strip leading slashes
                                imgPath = imgPath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString());
                                var candidate = Path.Combine(_env.ContentRootPath ?? string.Empty, "wwwroot", imgPath);
                                if (File.Exists(candidate))
                                {
                                    var bytes = File.ReadAllBytes(candidate);
                                    var name = Path.GetFileName(candidate);
                                    var contentType = "image/jpeg"; // default
                                    attachments.Add(new EmailAttachment(name, contentType, BinaryData.FromBytes(bytes)));
                                }
                            }
                            catch (Exception ex2)
                            {
                                _logger.LogDebug(ex2, "Failed to attach selected card image {Id}", sc.Id);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to prepare attachments for admin email");
                }
                if (attachments.Count > 0)
                {
                    // EmailMessage.Attachments is a collection; add items individually
                    foreach (var a in attachments)
                    {
                        message.Attachments.Add(a);
                    }
                }
                try
                {
                    var response = await client.SendAsync(Azure.WaitUntil.Completed, message);
                    _logger.LogInformation("ACS admin email sent for {Code}. Status={Status}", order.Code, response.Value?.Status);
                }
                catch (RequestFailedException ex)
                {
                    _logger.LogError(ex, "ACS admin email failed for {Code}", order.Code);
                    throw;
                }
            }

        // Customer confirmation (if email present)
        if (!string.IsNullOrWhiteSpace(order.Email))
        {
            var subject = lang == "mk" ? $"TamaraDiary - Примена нарачка {order.Code}" : $"TamaraDiary order received {order.Code}";
            var html = lang == "mk" ? BuildCustomerHtmlMk(order) : BuildCustomerHtml(order);
            var content = new EmailContent(subject) { Html = html, PlainText = (lang == "mk" ? BuildPlainTextMk(order) : BuildPlainText(order)) };
            var recipients = new EmailRecipients(new[] { new EmailAddress(order.Email) }.ToList());
            var message = new EmailMessage(fromAddress, recipients, content);

            // Attach uploaded files so customer can download them from their email as well
            try
            {
                if (order.UploadedFiles != null && order.UploadedFiles.Count > 0)
                {
                    foreach (var f in order.UploadedFiles)
                    {
                        if (string.IsNullOrWhiteSpace(f.DataUrl)) continue;
                        var idx = f.DataUrl.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
                            if (idx > -1)
                            {
                                var b64 = f.DataUrl.Substring(idx + 7);
                                var name = string.IsNullOrWhiteSpace(f.Name) ? "upload" : f.Name;
                                var bytes = Convert.FromBase64String(b64);
                                message.Attachments.Add(new EmailAttachment(name, f.ContentType ?? "application/octet-stream", BinaryData.FromBytes(bytes)));
                            }
                    }
                }
                // Do NOT attach the brand logo as an attachment; keep it embedded in HTML only.
                // If no uploaded files were sent, try to attach selected gallery images from wwwroot as a fallback
                if ((order.UploadedFiles == null || order.UploadedFiles.Count == 0) && order.SelectedCards != null && order.SelectedCards.Count > 0)
                {
                    foreach (var sc in order.SelectedCards)
                    {
                        try
                        {
                            var imgPath = sc.Image ?? string.Empty;
                            if (string.IsNullOrWhiteSpace(imgPath)) continue;
                            imgPath = imgPath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString());
                            var candidate = Path.Combine(_env.ContentRootPath ?? string.Empty, "wwwroot", imgPath);
                            if (File.Exists(candidate))
                            {
                                var bytes = File.ReadAllBytes(candidate);
                                var name = Path.GetFileName(candidate);
                                var contentType = "image/jpeg"; // default
                                message.Attachments.Add(new EmailAttachment(name, contentType, BinaryData.FromBytes(bytes)));
                            }
                        }
                        catch (Exception ex2)
                        {
                            _logger.LogDebug(ex2, "Failed to attach selected card image for customer {Id}", sc.Id);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to attach files to customer email");
            }
            try
            {
                var response = await client.SendAsync(Azure.WaitUntil.Completed, message);
                _logger.LogInformation("ACS customer email sent for {Code} to {Email}. Status={Status}", order.Code, order.Email, response.Value?.Status);
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "ACS customer email failed for {Code} to {Email}", order.Code, order.Email);
                throw;
            }
        }
    }

    private string BuildPlainText(TrackedOrder o)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Order code: {o.Code}");
        sb.AppendLine();
    // Include customer identity and delivery address for Tamara
    var name = $"{o.FirstName} {o.LastName}".Trim();
        sb.AppendLine($"Name: {name}");
        sb.AppendLine($"Email: {o.Email}");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"Phone: {o.Phone}");
        if (!string.IsNullOrWhiteSpace(o.Address)) sb.AppendLine($"Address: {o.Address}");
        if (!string.IsNullOrWhiteSpace(o.Instagram)) sb.AppendLine($"Instagram: {o.Instagram}");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"Item: {o.ProductTitle}");
        // Explicitly state pack type and expected attachments
        if (o.IsCustomPortrait)
        {
            sb.AppendLine("Type: Custom illustration (reference photo(s) attached)");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("bonita", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine($"Type: No worries Bonita (select {Math.Max(5, o.Quantity)} cards) — images attached");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("card", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine($"Type: Card pack (min 3 cards) — images attached");
        }
        sb.AppendLine($"Quantity: {o.Quantity}");
        if (!string.IsNullOrWhiteSpace(o.Notes))
        {
            sb.AppendLine();
            sb.AppendLine("Notes:");
            sb.AppendLine(o.Notes);
        }
        // Prefer explicit uploaded file names, fall back to UploadedFiles if names list is empty
        var uploadedNames = (o.UploadedFileNames != null && o.UploadedFileNames.Count > 0) ? o.UploadedFileNames : (o.UploadedFiles?.Select(f => f.Name).Where(n => !string.IsNullOrWhiteSpace(n)).ToList() ?? new List<string>());
        if (uploadedNames?.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Uploaded files:");
            foreach (var f in uploadedNames) sb.AppendLine($"- {f}");
        }
        if (o.SelectedCards?.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Selected cards:");
            foreach (var c in o.SelectedCards) sb.AppendLine($"- {c.Title ?? c.Id}");
        }
        sb.AppendLine();
        sb.AppendLine("Payment: Cash on delivery (upon arrival)");
        sb.AppendLine("Tamara will notify you with the estimated delivery date.");
        sb.AppendLine();
        sb.AppendLine($"If you need to look up your order later use the code above: {o.Code}");
        return sb.ToString();
    }

    private string BuildAdminHtml(TrackedOrder o)
    {
        // Admin email should be minimal: logo at top and a minimal identifier.
        var sb = new System.Text.StringBuilder();
        if (!string.IsNullOrWhiteSpace(_logoDataUrl))
        {
            sb.AppendLine($"<div style=\"margin-bottom:12px\"><img src=\"{_logoDataUrl}\" alt=\"TamaraDiary\" style=\"height:48px;\"/></div>");
        }
        // Include order id and customer details so Tamara has delivery information in the notification
        sb.AppendLine($"<p style=\"font-size:14px;margin:6px 0 0 0;\"><strong>Order:</strong> {System.Net.WebUtility.HtmlEncode(o.Code)}</p>");
    var name = $"{o.FirstName} {o.LastName}".Trim();
        sb.AppendLine("<div style=\"margin-top:8px;border-top:1px solid #eee;padding-top:8px;font-size:14px;\">");
        sb.AppendLine($"<div><strong>Name:</strong> {System.Net.WebUtility.HtmlEncode(name)}</div>");
        sb.AppendLine($"<div><strong>Email:</strong> {System.Net.WebUtility.HtmlEncode(o.Email)}</div>");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"<div><strong>Phone:</strong> {System.Net.WebUtility.HtmlEncode(o.Phone)}</div>");
        if (!string.IsNullOrWhiteSpace(o.Address)) sb.AppendLine($"<div><strong>Address:</strong> {System.Net.WebUtility.HtmlEncode(o.Address)}</div>");
        if (!string.IsNullOrWhiteSpace(o.Instagram)) sb.AppendLine($"<div><strong>Instagram:</strong> @{System.Net.WebUtility.HtmlEncode(o.Instagram)}</div>");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"<div><strong>Item:</strong> {System.Net.WebUtility.HtmlEncode(o.ProductTitle)}</div>");
        // Explicit pack/type hints
        if (o.IsCustomPortrait)
        {
            sb.AppendLine($"<div><strong>Type:</strong> Custom illustration (reference photo(s) attached)</div>");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("bonita", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine($"<div><strong>Type:</strong> No worries Bonita (selected {Math.Max(5, o.Quantity)} cards) — images attached</div>");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("card", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine($"<div><strong>Type:</strong> Card pack (min 3 cards) — images attached</div>");
        }
        sb.AppendLine($"<div><strong>Quantity:</strong> {o.Quantity}</div>");
        if (!string.IsNullOrWhiteSpace(o.Notes)) sb.AppendLine($"<div style=\"margin-top:6px\"><strong>Notes:</strong><div>{System.Net.WebUtility.HtmlEncode(o.Notes).Replace("\n","<br />")}</div></div>");
        sb.AppendLine("</div>");
        // If there are uploaded files (including gallery images attached by the frontend), list them so Tamara can quickly reference attachments
        var uploaded = o.UploadedFiles ?? new List<UploadedFile>();
        if (uploaded.Count > 0)
        {
            sb.AppendLine("<div style=\"margin-top:8px;font-size:13px;color:#444\"><strong>Attached files:</strong>");
            sb.AppendLine("<ul style=\"padding-left:18px;margin:6px 0 0 0;\">");
            foreach (var fn in uploaded) sb.AppendLine($"<li>{System.Net.WebUtility.HtmlEncode(fn.Name)}</li>");
            sb.AppendLine("</ul></div>");
        }
        // If the user selected gallery cards, show their titles (and ids) so Tamara knows which designs were chosen
        if (o.SelectedCards?.Count > 0)
        {
            sb.AppendLine("<div style=\"margin-top:8px;font-size:13px;color:#444\"><strong>Selected cards:</strong>");
            sb.AppendLine("<ul style=\"padding-left:18px;margin:6px 0 0 0;\">");
            foreach (var c in o.SelectedCards) sb.AppendLine($"<li>{System.Net.WebUtility.HtmlEncode(c.Title ?? c.Id)} ({System.Net.WebUtility.HtmlEncode(c.Id)})</li>");
            sb.AppendLine("</ul></div>");
        }
        return sb.ToString();
    }

    private string BuildCustomerHtml(TrackedOrder o)
    {
        var sb = new System.Text.StringBuilder();
        if (!string.IsNullOrWhiteSpace(_logoDataUrl))
        {
            sb.AppendLine($"<div style=\"margin-bottom:12px\"><img src=\"{_logoDataUrl}\" alt=\"TamaraDiary\" style=\"height:48px;\"/></div>");
        }
    var customerFullName = $"{o.FirstName} {o.LastName}".Trim();
    sb.AppendLine($"<p>Dear {System.Net.WebUtility.HtmlEncode(customerFullName)},</p>");
        sb.AppendLine($"<p>Thank you for your order <strong>{o.Code}</strong>. We received your request and will contact you with the estimated delivery date.</p>");
        sb.AppendLine("<p><strong>Order summary</strong></p>");
        sb.AppendLine("<ul>");
        sb.AppendLine($"<li><strong>Order code:</strong> {System.Net.WebUtility.HtmlEncode(o.Code)}</li>");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"<li><strong>Item:</strong> {System.Net.WebUtility.HtmlEncode(o.ProductTitle)}</li>");
        // Show explicit pack/type and note attachments will be included
        if (o.IsCustomPortrait)
        {
            sb.AppendLine("<li><strong>Type:</strong> Custom illustration (reference photo(s) attached)</li>");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("bonita", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("<li><strong>Type:</strong> No worries Bonita — your selected images are attached</li>");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("card", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("<li><strong>Type:</strong> Card pack — selected images attached</li>");
        }
        sb.AppendLine($"<li><strong>Quantity:</strong> {o.Quantity}</li>");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"<li><strong>Phone:</strong> {System.Net.WebUtility.HtmlEncode(o.Phone)}</li>");
        if (!string.IsNullOrWhiteSpace(o.Instagram)) sb.AppendLine($"<li><strong>Instagram:</strong> @{System.Net.WebUtility.HtmlEncode(o.Instagram)}</li>");
        sb.AppendLine("</ul>");

        if (o.UploadedFiles?.Count > 0)
        {
            sb.AppendLine("<h4>Your uploaded reference photo(s)</h4>");
            foreach (var f in o.UploadedFiles)
            {
                // show a small preview in the customer email when possible
                sb.AppendLine($"<div style='margin-bottom:8px'><div style='font-size:0.9rem'>{System.Net.WebUtility.HtmlEncode(f.Name)}</div>");
                if (!string.IsNullOrWhiteSpace(f.DataUrl) && (f.DataUrl.StartsWith("data:image/") || f.ContentType?.StartsWith("image/") == true))
                {
                    sb.AppendLine($"<img src=\"{System.Net.WebUtility.HtmlEncode(f.DataUrl)}\" style=\"max-width:320px;max-height:320px;border:1px solid #ddd;border-radius:8px\"/>");
                }
                sb.AppendLine("</div>");
            }
        }

        if (!string.IsNullOrWhiteSpace(o.Notes))
        {
            sb.AppendLine("<h4>Notes</h4>");
            sb.AppendLine($"<p>{System.Net.WebUtility.HtmlEncode(o.Notes).Replace("\n","<br />")}</p>");
        }

        sb.AppendLine("<p>If you need to look up your order later, keep this code: <strong>" + System.Net.WebUtility.HtmlEncode(o.Code) + "</strong></p>");
        sb.AppendLine("<p>Warm regards,<br/>TamaraDiary</p>");
        return sb.ToString();
    }

    // Macedonian version of the customer HTML email (simple, hardcoded)
    private string BuildCustomerHtmlMk(TrackedOrder o)
    {
        var sb = new System.Text.StringBuilder();
        if (!string.IsNullOrWhiteSpace(_logoDataUrl))
        {
            sb.AppendLine($"<div style=\"margin-bottom:12px\"><img src=\"{_logoDataUrl}\" alt=\"TamaraDiary\" style=\"height:48px;\"/></div>");
        }
        var customerFullName = $"{o.FirstName} {o.LastName}".Trim();
        sb.AppendLine($"<p>Почитуван(а) {System.Net.WebUtility.HtmlEncode(customerFullName)},</p>");
        sb.AppendLine($"<p>Ви благодариме за нарачката <strong>{System.Net.WebUtility.HtmlEncode(o.Code)}</strong>. Го примивме вашето барање и наскоро ќе ве известиме за очекуваниот датум на испорака.</p>");
        sb.AppendLine("<p><strong>Резиме на нарачката</strong></p>");
        sb.AppendLine("<ul>");
        sb.AppendLine($"<li><strong>Код на нарачка:</strong> {System.Net.WebUtility.HtmlEncode(o.Code)}</li>");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"<li><strong>Артикл:</strong> {System.Net.WebUtility.HtmlEncode(o.ProductTitle)}</li>");
        if (o.IsCustomPortrait)
        {
            sb.AppendLine("<li><strong>Тип:</strong> Прилагоден портрет (референцни фотографии се приложени)</li>");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("bonita", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("<li><strong>Тип:</strong> No worries Bonita — избраните слики се приложени</li>");
        }
        else if (!string.IsNullOrWhiteSpace(o.ProductId) && o.ProductId.Contains("card", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("<li><strong>Тип:</strong> Пакет картички — избраните слики се приложени</li>");
        }
        sb.AppendLine($"<li><strong>Количина:</strong> {o.Quantity}</li>");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"<li><strong>Телефон:</strong> {System.Net.WebUtility.HtmlEncode(o.Phone)}</li>");
        if (!string.IsNullOrWhiteSpace(o.Instagram)) sb.AppendLine($"<li><strong>Instagram:</strong> @{System.Net.WebUtility.HtmlEncode(o.Instagram)}</li>");
        sb.AppendLine("</ul>");

        if (o.UploadedFiles?.Count > 0)
        {
            sb.AppendLine("<h4>Вашите пратени референцни фотографии</h4>");
            foreach (var f in o.UploadedFiles)
            {
                sb.AppendLine($"<div style='margin-bottom:8px'><div style='font-size:0.9rem'>{System.Net.WebUtility.HtmlEncode(f.Name)}</div>");
                if (!string.IsNullOrWhiteSpace(f.DataUrl) && (f.DataUrl.StartsWith("data:image/") || f.ContentType?.StartsWith("image/") == true))
                {
                    sb.AppendLine($"<img src=\"{System.Net.WebUtility.HtmlEncode(f.DataUrl)}\" style=\"max-width:320px;max-height:320px;border:1px solid #ddd;border-radius:8px\"/>");
                }
                sb.AppendLine("</div>");
            }
        }

        if (!string.IsNullOrWhiteSpace(o.Notes))
        {
            sb.AppendLine("<h4>Белешки</h4>");
            sb.AppendLine($"<p>{System.Net.WebUtility.HtmlEncode(o.Notes).Replace("\n","<br />")}</p>");
        }

        sb.AppendLine($"<p>За да ја проверите нарачката подоцна зачувајте го овој код: <strong>{System.Net.WebUtility.HtmlEncode(o.Code)}</strong></p>");
    sb.AppendLine("<p>Со почит,<br/>TamaraDiary</p>");
        return sb.ToString();
    }

    private string BuildPlainTextMk(TrackedOrder o)
    {
        // Reuse the stub implementation's MK builder for consistency
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Код на нарачка: {o.Code}");
        sb.AppendLine();
        var name = $"{o.FirstName} {o.LastName}".Trim();
        sb.AppendLine($"Име: {name}");
        sb.AppendLine($"Е-пошта: {o.Email}");
        if (!string.IsNullOrWhiteSpace(o.Phone)) sb.AppendLine($"Телефон: {o.Phone}");
        if (!string.IsNullOrWhiteSpace(o.ProductTitle)) sb.AppendLine($"Артикл: {o.ProductTitle}");
        sb.AppendLine($"Количина: {o.Quantity}");
        if (!string.IsNullOrWhiteSpace(o.Notes))
        {
            sb.AppendLine();
            sb.AppendLine("Белешки:");
            sb.AppendLine(o.Notes);
        }
        sb.AppendLine();
        sb.AppendLine("Плаќање: Плаќање при достава (готовина)");
        sb.AppendLine("Тамара ќе ве извести за очекуваниот датум на испорака.");
        sb.AppendLine();
        sb.AppendLine($"Код за следење: {o.Code}");
        return sb.ToString();
    }
}
