using Microsoft.AspNetCore.Mvc;
using Azure;
using Azure.Communication.Email;

namespace TamaraDiary.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    public record SendEmailRequest(List<string> To, string Subject, string? Html, string? Text);

    private readonly IConfiguration _config;
    private readonly ILogger<EmailController> _logger;
    public EmailController(IConfiguration config, ILogger<EmailController> logger)
    {
        _config = config;
        _logger = logger;
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] SendEmailRequest request)
    {
        if (request.To is null || request.To.Count == 0) return BadRequest("Missing recipients");
        if (string.IsNullOrWhiteSpace(request.Subject)) return BadRequest("Missing subject");

        var provider = _config["Email:Provider"]?.ToLowerInvariant() ?? "stub";
        if (provider == "stub")
        {
            _logger.LogInformation("[EmailController] Stub send to {Recipients} subject '{Subject}'", string.Join(", ", request.To), request.Subject);
            return Ok(new { accepted = true, provider });
        }

        if (provider == "acs")
        {
            var connectionString = _config["Email:ConnectionString"];
            var fromAddress = _config["Email:From"];
            if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(fromAddress))
            {
                return StatusCode(500, "Email:ConnectionString or Email:From not configured");
            }

            try
            {
                var client = new EmailClient(connectionString);
                var content = new EmailContent(request.Subject)
                {
                    Html = request.Html,
                    PlainText = request.Text
                };
                var recipients = new EmailRecipients(request.To.Select(to => new EmailAddress(to)).ToList());
                var message = new EmailMessage(fromAddress, recipients, content);
                var response = await client.SendAsync(Azure.WaitUntil.Completed, message);
                _logger.LogInformation("ACS email sent. Status={Status}", response.Value?.Status);
                return Ok(new { accepted = true, provider, status = response.Value?.Status.ToString() });
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "ACS email send failed");
                return StatusCode(502, $"ACS send failed: {ex.Message}");
            }
        }

        return BadRequest($"Unknown Email provider: {provider}");
    }
}
