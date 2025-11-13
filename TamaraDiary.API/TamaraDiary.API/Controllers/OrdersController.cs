using Microsoft.AspNetCore.Mvc;
using TamaraDiary.API.Models;
using TamaraDiary.API.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace TamaraDiary.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrdersService _orders;
    public OrdersController(IOrdersService orders) { _orders = orders; }

    [HttpGet("{code}")]
    public ActionResult<TrackedOrder?> Get(string code)
    {
        var o = _orders.Get(code);
        return o is not null ? o : NotFound();
    }

    [HttpGet]
    public ActionResult<IEnumerable<TrackedOrder>> List([FromQuery] int max = 50)
        => _orders.List(max).ToList();

    [HttpPost]
    public async Task<ActionResult<TrackedOrder>> Create([FromBody] TrackedOrder order)
    {
        try
        {
            var created = await _orders.Create(order);
            return CreatedAtAction(nameof(Get), new { code = created.Code }, created);
        }
        catch (ArgumentException ex)
        {
            // Return a structured JSON error response for validation failures
            var payload = new {
                error = ex.Message,
                code = "validation_error"
            };
            return BadRequest(payload);
        }
    }

    // Accept multipart/form-data to create an order with IFormFile uploads (recommended for binary files)
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<TrackedOrder>> CreateFromForm()
    {
        try
        {
            var form = await Request.ReadFormAsync();
            // Read simple fields
            string code = form["code"].FirstOrDefault() ?? string.Empty;
            string firstName = form["firstName"].FirstOrDefault();
            string lastName = form["lastName"].FirstOrDefault();
            string address = form["address"].FirstOrDefault();
            string email = form["email"].FirstOrDefault() ?? string.Empty;
            string phone = form["phone"].FirstOrDefault();
            string instagram = form["instagram"].FirstOrDefault();
            string productId = form["productId"].FirstOrDefault();
            string productTitle = form["productTitle"].FirstOrDefault();
            string notes = form["notes"].FirstOrDefault();
            var qtyStr = form["quantity"].FirstOrDefault();
            int quantity = 1; if (!string.IsNullOrWhiteSpace(qtyStr) && int.TryParse(qtyStr, out var q)) quantity = q;
            var selectedCsv = form["selectedCardIds"].FirstOrDefault();
            var selected = new List<string>();
            if (!string.IsNullOrWhiteSpace(selectedCsv)) selected = selectedCsv.Split(',').Select(s => s.Trim()).Where(s => s.Length>0).ToList();

            // Convert files
            var uploaded = new List<UploadedFile>();
            foreach (var file in form.Files)
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var bytes = ms.ToArray();
                var b64 = Convert.ToBase64String(bytes);
                var dataUrl = $"data:{file.ContentType};base64,{b64}";
                uploaded.Add(new UploadedFile(file.FileName, file.ContentType, file.Length, dataUrl));
            }

            var order = new TrackedOrder
            {
                Code = code,
                FirstName = firstName,
                LastName = lastName,
                Address = address,
                Email = email,
                Phone = phone,
                Instagram = instagram,
                ProductId = productId,
                ProductTitle = productTitle,
                Quantity = quantity,
                Notes = notes,
                UploadedFiles = uploaded,
                UploadedFileNames = uploaded.Select(f => f.Name).ToList(),
                SelectedCardIds = selected
            };

            // Optional language field (e.g. 'mk' or 'en') so frontend can request localized emails
            var lang = form["language"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(lang))
            {
                order = order with { Language = lang };
            }

            var created = await _orders.Create(order);
            return CreatedAtAction(nameof(Get), new { code = created.Code }, created);
        }
        catch (ArgumentException ex)
        {
            var payload = new {
                error = ex.Message,
                code = "validation_error"
            };
            return BadRequest(payload);
        }
    }

    public record UpdateStatusRequest(OrderStatus Status, string? Note, string? By);
    [HttpPost("{code}/status")]
    public async Task<IActionResult> UpdateStatus(string code, [FromBody] UpdateStatusRequest req)
    {
        try
        {
            await _orders.UpdateStatusAsync(code, req.Status, req.Note, req.By);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            var payload = new { error = ex.Message, code = "validation_error" };
            return BadRequest(payload);
        }
    }

    public record UpdateEtaRequest(DateTime? StartUtc, DateTime? EndUtc, string? By);
    [HttpPost("{code}/eta")]
    public IActionResult UpdateEta(string code, [FromBody] UpdateEtaRequest req)
    {
        try
        {
            _orders.UpdateEta(code, req.StartUtc, req.EndUtc, req.By);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    // Append uploaded files to an existing order
    [HttpPost("{code}/files")]
    public IActionResult AddFiles(string code, [FromBody] List<UploadedFile> files)
    {
        try
        {
            _orders.AddFiles(code, files);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    // Tamara: Get uploaded photo for an order
    [HttpGet("{code}/photo/{index}")]
    public IActionResult GetPhoto(string code, int index = 0)
    {
        var order = _orders.Get(code);
        if (order is null || order.UploadedFiles.Count <= index) return NotFound();
        var file = order.UploadedFiles[index];
        return Ok(new { name = file.Name, dataUrl = file.DataUrl });
    }
}
