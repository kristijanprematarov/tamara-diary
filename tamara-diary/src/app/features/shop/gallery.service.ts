import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Product = { id: string; title: string; priceEur: number; images: string[]; caption: string; minQty?: number };

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private http = inject(HttpClient);
  getProducts(): Observable<Product[]> {
    // Use the local public/gallery copy to match the original Blazor site's assets
    return this.http.get<Product[]>('/gallery/products.json');
  }
  getGallery(target?: string): Observable<any> {
    // If a specific gallery target is passed, try to load a matching gallery JSON file.
    // Map known targets to filenames; otherwise fall back to the main gallery.json
    let file = 'gallery.json';
    if (target === 'bonita-notes-pack') file = 'bonita-notes-pack-gallery.json';
    else if (target === 'card-pack' || target === 'cards') file = 'cards-gallery.json';
    return this.http.get<any>(`/gallery/${file}`);
  }
}
