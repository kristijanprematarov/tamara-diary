using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.IO.Abstractions;

namespace TamaraDiary.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GalleryController : ControllerBase
{
    private readonly IFileSystem _fs;
    public GalleryController(IFileSystem fs) { _fs = fs; }
    // Reads gallery/products JSON files from configured static content root (API web root or external root)
    [HttpGet("gallery.json")]
    public IActionResult GetGallery()
    {
        // Try to serve existing gallery.json; if not present, build from files in /gallery
        var (ok, json) = TryReadJson("gallery/gallery.json");
        if (ok) return Content(json, "application/json");

        var built = TryBuildGalleryJson();
        if (built is null) return NotFound();
        return Content(built, "application/json");
    }

    [HttpGet("products.json")]
    public IActionResult GetProducts()
    {
        var (ok, json) = TryReadJson("gallery/products.json");
        if (!ok) return NotFound();
        return Content(json, "application/json");
    }

    private (bool ok, string json) TryReadJson(string relative)
    {
        // Prefer API wwwroot first, then external root if configured
        var env = HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var webRoot = env.WebRootPath ?? string.Empty;
        var config = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var external = config["StaticContent:ExternalRoot"] ?? string.Empty;

        foreach (var root in new[] { webRoot, external })
        {
            if (string.IsNullOrWhiteSpace(root)) continue;
            var path = _fs.Path.Combine(root, relative.Replace('/', _fs.Path.DirectorySeparatorChar));
            if (_fs.File.Exists(path))
            {
                var json = _fs.File.ReadAllText(path);
                // validate json
                try { JsonDocument.Parse(json); } catch { continue; }
                return (true, json);
            }
        }
        return (false, string.Empty);
    }

    private string? TryBuildGalleryJson()
    {
        var env = HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var webRoot = env.WebRootPath ?? string.Empty;
        var config = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var external = config["StaticContent:ExternalRoot"] ?? string.Empty;

        foreach (var root in new[] { webRoot, external })
        {
            if (string.IsNullOrWhiteSpace(root)) continue;
            var dir = _fs.Path.Combine(root, "gallery");
            if (!_fs.Directory.Exists(dir)) continue;

            var images = _fs.Directory.EnumerateFiles(dir)
                .Where(f => HasImageExtension(f))
                .Select(f => new { key = _fs.Path.GetFileNameWithoutExtension(f), path = $"gallery/{_fs.Path.GetFileName(f)}" })
                .ToList();

            if (images.Count == 0) continue;

            // Build a simple JSON map { key: path }
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var it in images)
            {
                if (!string.IsNullOrWhiteSpace(it.key))
                    dict[it.key] = it.path.Replace('\\', '/');
            }
            return System.Text.Json.JsonSerializer.Serialize(dict);
        }

        return null;
    }

    private static bool HasImageExtension(string filePath)
    {
        var ext = System.IO.Path.GetExtension(filePath).ToLowerInvariant();
        return ext is ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp";
    }
}
