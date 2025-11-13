using Microsoft.Extensions.FileProviders;
using System.IO.Abstractions;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// Register email sender implementations and orders service
builder.Services.AddSingleton<IFileSystem, FileSystem>();
// Register IEmailSender depending on configuration at runtime. We'll register a factory so the
// implementation can read IConfiguration and ILogger from DI.
builder.Services.AddSingleton<TamaraDiary.API.Services.IEmailSender>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var provider = config["Email:Provider"]?.ToLowerInvariant() ?? "stub";
    if (provider == "acs")
    {
        var logger = sp.GetRequiredService<ILogger<TamaraDiary.API.Services.AzureCommunicationEmailSender>>();
        var env = sp.GetRequiredService<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
        return new TamaraDiary.API.Services.AzureCommunicationEmailSender(config, logger, env);
    }
    else
    {
        var logger = sp.GetRequiredService<ILogger<TamaraDiary.API.Services.StubEmailSender>>();
        return new TamaraDiary.API.Services.StubEmailSender(logger, config);
    }
});

builder.Services.AddSingleton<TamaraDiary.API.Services.IOrdersService, TamaraDiary.API.Services.OrdersService>();

// CORS for Angular dev server
const string CorsPolicy = "AllowAngular";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

// Swagger in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Serve static files from API's own wwwroot if present
app.UseStaticFiles();

// Optionally also serve static content from an external folder (the old Blazor wwwroot)
// Configure path in appsettings: "StaticContent:ExternalRoot"
var externalRoot = app.Configuration["StaticContent:ExternalRoot"];
if (!string.IsNullOrWhiteSpace(externalRoot) && Directory.Exists(externalRoot))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(externalRoot),
        RequestPath = string.Empty // expose at root, e.g., /gallery/... /sample-data/...
    });
}

app.UseCors(CorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
