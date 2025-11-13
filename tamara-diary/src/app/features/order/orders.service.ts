import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export type TrackedOrder = {
  code: string;
  createdUtc?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  email: string;
  phone?: string;
  instagram?: string;
  isCustomPortrait?: boolean;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  quantity?: number;
  notes?: string;
  uploadedFileNames?: string[];
  uploadedFiles?: any[];
  language?: string;
  // IDs of TamaraDiary cards selected by the customer (if ordering a pack)
  selectedCardIds?: string[];
  // Optional preview objects for each selected card (id, translated title, image path)
  selectedCards?: { id: string; title?: string; image?: string }[];
  status?: number;
  logs?: { timestampUtc: string; event: string; newStatus?: number; note?: string; by?: string }[];
  rejectionReason?: string;
  estimatedDeliveryUtc?: string;
  estimatedDeliveryStartUtc?: string;
  estimatedDeliveryEndUtc?: string;
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  create(order: TrackedOrder): Observable<any> {
    // Attach current UI language so backend can send a localized email (mk/en)
    try {
      const lang = this.translate.currentLang || this.translate.getDefaultLang() || 'mk';
      (order as any).language = lang;
    } catch {
      // If translate not available, default to mk
      (order as any).language = 'mk';
    }
    return this.http.post('/api/orders', order);
  }

  get(code: string): Observable<TrackedOrder> {
    return this.http.get<TrackedOrder>(`/api/orders/${encodeURIComponent(code)}`);
  }

  updateStatus(code: string, status: number, note?: string, by?: string): Observable<any> {
    return this.http.post(`/api/orders/${encodeURIComponent(code)}/status`, { status, note, by });
  }

  updateEta(code: string, startUtc: string | null, endUtc: string | null, by?: string): Observable<any> {
    return this.http.post(`/api/orders/${encodeURIComponent(code)}/eta`, { startUtc, endUtc, by });
  }

  // append uploaded files (dataUrls) to an existing order
  addFiles(code: string, files: { name: string; contentType: string; size: number; dataUrl: string }[]): Observable<any> {
    return this.http.post(`/api/orders/${encodeURIComponent(code)}/files`, files);
  }
}
