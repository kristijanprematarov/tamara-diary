# TamaraDiary.API

Backend API for the Angular web UI. Provides:
- Orders lifecycle: create/list/get/update status/update ETA
- Gallery and products JSON from static content
- Email sending via Azure Communication Services (ACS) or stub
- Static file hosting for gallery images and sample data

## Configure static content root
To reuse the original Blazor assets (gallery images, products.json, gallery.json, sample-data), set `StaticContent:ExternalRoot` to the Blazor `wwwroot` folder in `appsettings.json`:

Example on Windows:
```
{
  "StaticContent": {
    "ExternalRoot": "C:\\Users\\<you>\\source\\repos\\TDiary\\TamaraDiary\\TamaraDiary\\wwwroot"
  }
}
```

When `gallery/gallery.json` exists, it is served. If absent, the API will scan the `gallery` folder and build a JSON map `{ key: path }` on the fly.

## Email provider
Set the email provider in `appsettings.json`:
```
"Email": {
  "Provider": "stub" // or "acs"
}
```

For ACS, also set:
```
"Email": {
  "Provider": "acs",
  "ConnectionString": "<acs-connection-string>",
  "From": "DoNotReply@<resource>.azurecomm.net"
}
```

POST `/api/email/send` body:
```
{
  "to": ["someone@example.com"],
  "subject": "Hello",
  "html": "<b>Hi</b>",
  "text": "Hi"
}
```

## CORS and Swagger
- CORS allows Angular dev at http://localhost:4200
- Swagger is enabled in Development

## Orders endpoints (summary)
- POST `/api/orders`  – create
- GET `/api/orders`   – list (newest first)
- GET `/api/orders/{code}` – get by code
- POST `/api/orders/{code}/status` – update status (InProgress/Packaging/Delivering/Delivered/Rejected)
- POST `/api/orders/{code}/eta` – update ETA (single day or start..end window)

## Static file hosting
- API serves its own `wwwroot` if present
- If `StaticContent:ExternalRoot` is configured and exists, those files are served at the root as well (e.g., `/gallery/...`, `/sample-data/...`).
