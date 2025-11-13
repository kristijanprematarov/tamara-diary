import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService, TrackedOrder } from './orders.service';
import { GalleryService } from '../shop/gallery.service';
import { CurrencyService } from '../../services/currency.service';
import { SelectionService } from '../../services/selection.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'td-order',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
  <h1>{{ 'order.title' | translate }}</h1>
  <div class="form-note" style="margin-bottom:.75rem;font-size:.95rem;color:#333">{{ 'order.requiredNote' | translate }}</div>
  <div *ngIf="serverError" class="alert" style="border-color:#f5c6cb;background:#fff0f0;color:#a33;margin-bottom:1rem;padding:.75rem;border-radius:6px">{{ serverError }}</div>
  <form (ngSubmit)="submit()" #f="ngForm" class="form" enctype="multipart/form-data">
    <div class="grid">
      <label>
        <div style="display:flex;gap:.5rem">
          <div style="flex:1">{{ 'order.firstName' | translate }}<span class="required-star">*</span></div>
          <div style="flex:1">{{ 'order.lastName' | translate }}<span class="required-star">*</span></div>
        </div>
          <div style="display:flex;gap:.5rem;margin-top:.25rem">
          <input #firstNameCtrl="ngModel" name="firstName" style="flex:1;min-width:0" [(ngModel)]="firstName" required aria-required="true" (input)="onNameInput($event)" />
          <input #lastNameCtrl="ngModel" name="lastName" style="flex:1;min-width:0" [(ngModel)]="lastName" required aria-required="true" (input)="onNameInput($event)" />
        </div>
        <div *ngIf="(firstNameCtrl.invalid && (firstNameCtrl.touched || f.submitted)) || (lastNameCtrl.invalid && (lastNameCtrl.touched || f.submitted))" class="form-text" style="color:#a33">
          {{ 'order.fieldRequired' | translate }}
        </div>
      </label>
      <label>
        <div>{{ 'order.email' | translate }}<span class="required-star">*</span></div>
        <input #emailCtrl="ngModel" name="email" [(ngModel)]="email" type="email" required aria-required="true" (input)="onEmailInput($event)" />
        <div *ngIf="(emailCtrl.invalid && (emailCtrl.touched || f.submitted)) || emailError" class="form-text" style="color:#a33">
          <span *ngIf="emailCtrl.errors?.['required']">{{ 'order.fieldRequired' | translate }}</span>
          <span *ngIf="emailCtrl.errors?.['email'] || (email && !email.includes('@'))">{{ 'order.emailInvalid' | translate }}</span>
          <span *ngIf="emailError">{{ emailError }}</span>
        </div>
      </label>
      <label>
        <div>{{ 'order.phone' | translate }}<span class="required-star">*</span></div>
        <input #phoneCtrl="ngModel" name="phone" [(ngModel)]="phone" required aria-required="true" />
        <div *ngIf="phoneCtrl.invalid && (phoneCtrl.touched || f.submitted)" class="form-text" style="color:#a33">{{ 'order.fieldRequired' | translate }}</div>
      </label>
      <label class="col-12">
        <div>{{ 'order.address' | translate }}<span class="required-star">*</span></div>
        <input #addressCtrl="ngModel" name="address" [(ngModel)]="address" required aria-required="true" />
        <div *ngIf="addressCtrl.invalid && (addressCtrl.touched || f.submitted)" class="form-text" style="color:#a33">{{ 'order.fieldRequired' | translate }}</div>
      </label>
      <label>
        <div>{{ 'order.instagram' | translate }}</div>
        <input name="instagram" [(ngModel)]="instagram" />
      </label>
      <label>
        <div>{{ 'order.type' | translate }}</div>
        <div *ngIf="!isCustom">
          <strong>{{ displayTitle }}</strong>
          <div class="form-text" *ngIf="productId">{{ 'order.preselected' | translate }}</div>
        </div>
        <div *ngIf="isCustom">
          <!-- When coming from shop with a custom product, show it as preselected rather than asking the user again -->
          <strong>{{ displayTitle }}</strong>
          <div class="form-text" *ngIf="productId">{{ 'order.preselected' | translate }}</div>
        </div>
      </label>
      <ng-container *ngIf="isCustom">
        <label class="col-12">
          <div>{{ 'order.referencePhotos' | translate }}<span class="required-star">*</span></div>
          <input #fileInput type="file" name="files" (change)="onFilesSelected($event)" multiple accept="image/*,.pdf" />
          <div class="form-text" style="color:#a33" *ngIf="files.length===0 && (f.submitted)">{{ 'order.referenceRequired' | translate }}</div>
          <div class="form-text" *ngIf="files.length>0">{{ 'order.referenceRequired' | translate }}</div>
        </label>
      </ng-container>
      <label>
        <div>{{ 'order.quantity' | translate }}<span class="required-star">*</span></div>
        <div *ngIf="isBonita"><strong>1</strong></div>
        <input *ngIf="!isBonita" #qtyCtrl="ngModel" name="qty" type="number" [min]="minQty" step="1" [(ngModel)]="quantity" (input)="onQtyInput($event)" required aria-required="true" />
        <div *ngIf="!isBonita && minQty>1" class="form-text">{{ 'order.minimum' | translate }} {{minQty}}</div>
        <div *ngIf="qtyError || (f.submitted && ((quantity == null) || quantity < (minQty || 1)))" class="form-text" style="color:#a33">{{ qtyError || ('order.fieldRequired' | translate) }}</div>
      </label>

      <!-- Subtotal / breakdown -->
      <div class="col-12" style="margin-top:.5rem">
        <div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem">
          <div style="font-weight:600">{{ 'order.priceBreakdown' | translate }}</div>
        </div>
        <div class="form-text">{{ 'order.unitPrice' | translate }} <strong>{{ format(unitPriceEur) }}</strong></div>
        <div class="form-text">{{ 'order.quantity' | translate }}: <strong>{{ quantity }}</strong></div>
        <div class="form-text" style="margin-top:.25rem">{{ 'order.subtotal' | translate }}: <strong>{{ format(unitPriceEur * quantity) }}</strong></div>
      </div>
      <label class="col-12">
        <div>{{ 'order.notes' | translate }}</div>
        <textarea name="notes" rows="4" [(ngModel)]="notes"></textarea>
      </label>
      <!-- Selected TamaraDiary cards accordion -->
      <div *ngIf="selectedCards().length>0" class="col-12">
        <details open>
          <summary>{{ 'order.selectedCards' | translate:{n: selectedCards().length} }}</summary>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem">
            <li *ngFor="let id of selectedCards()" style="display:flex;align-items:center;gap:.5rem">
              <img [src]="getGalleryPath(id)" style="width:80px;height:60px;object-fit:cover;border-radius:6px" />
              <div style="flex:1">{{ id }}</div>
              <button type="button" class="btn btn-danger" style="background:#ff6b6b;border-color:#ff6b6b;color:#fff;padding:.35rem .6rem;border-radius:6px" (click)="requestRemove(id)">{{ 'order.remove' | translate }}</button>
            </li>
          </ul>
        </details>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.5rem">
      <div *ngIf="selectedCards().length>0 && selectedCards().length<minQty" class="form-text" style="color:#a33">
        {{ 'order.minimum' | translate }} {{minQty}}
      </div>
      <button class="btn btn-primary" type="submit" [disabled]="submitting || !isFormValid()" style="background:var(--brand-primary);border-color:var(--brand-primary);color:#fff">{{ 'order.submit' | translate }}</button>
    </div>
  </form>

  <div *ngIf="orderCode() && !submitting" class="alert success-alert">
    {{ 'order.created' | translate }}
    <div class="order-code">
      <code>{{ orderCode() }}</code>
      <button type="button" class="btn btn-sm btn-outline-primary ms-2" (click)="copyCode()">Copy</button>
      <span *ngIf="copied" class="text-success ms-2">Copied</span>
    </div>
  </div>
    <!-- Remove confirmation modal -->
    <div *ngIf="showRemoveModal()" class="modal-overlay" (click)="cancelRemove()" tabindex="0">
      <div class="modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="remove-title">
        <h3 id="remove-title">{{ 'order.removeConfirmTitle' | translate }}</h3>
        <p style="margin-top:.5rem">{{ 'order.removeConfirm' | translate:{id: pendingRemoveId() || ''} }}</p>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button class="btn" (click)="cancelRemove()">{{ 'common.cancel' | translate }}</button>
          <button class="btn btn-danger" style="background:#ff6b6b;border-color:#ff6b6b;color:#fff" (click)="confirmRemove()">{{ 'order.removeConfirmYes' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .success-alert{background:#f0fff4;border-color:#cfead8}
    .order-code{display:flex;align-items:center;gap:.5rem;margin-top:.5rem}
    .order-code code{background:#fff;padding:.25rem .5rem;border-radius:6px;border:1px solid #e7e7e7}
    .grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
    label{display:flex;flex-direction:column;gap:.5rem}
  input,select,textarea{padding:.5rem;border:1px solid #ddd;border-radius:6px;width:100%;box-sizing:border-box}
    .btn{margin-top:1rem}
    .alert{margin-top:1rem;padding:.75rem;border:1px solid #cce5cc;background:#f6fff6;border-radius:6px}
    .required-star{color:#a33;margin-left:.25rem;font-weight:600}
  /* Modal styles for remove confirmation */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000}
  .modal-card{background:#fff;padding:1.25rem;border-radius:10px;max-width:560px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.25)}
  .modal-card h3{margin:0;font-size:1.1rem}
  .modal-card p{color:#333;margin:0}
  `]
})
export class OrderComponent {
  private orders = inject(OrdersService);
  private gallery = inject(GalleryService);
  private currency = inject(CurrencyService);
  name = '';
  firstName = '';
  lastName = '';
  address = '';
  email = '';
  phone?: string;
  instagram?: string;
  item = 'Custom illustration';
  quantity = 1;
  minQty = 1;
  // unit price in EUR (app base). Defaults to 1000 MKD equivalent.
  unitPriceEur = 16.2601626;
  notes?: string;
  productId?: string;
  productTitle?: string;
  isCustom = false;
  submitting = false;
  copied = false;
  orderCode = signal<string | null>(null);
  files: File[] = [];
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  serverError: string | null = null;
  selectedCards = signal<string[]>([]);
  private galleryMap: Record<string,string> = {};
  private titleMap: Record<string,string> = {};
  private translate = inject(TranslateService);
  private selection = inject(SelectionService);
  private router = inject(Router);
  // Modal state for confirm remove
  pendingRemoveId = signal<string | null>(null);
  showRemoveModal = signal(false);
  // Bonita fixed set price in MKD
  private readonly BONITA_PRICE_MKD = 1500;
  qtyError: string | null = null;
  nameError: string | null = null;
  emailError: string | null = null;

  constructor(route: ActivatedRoute){
  const selSvc = this.selection;
    const pid = route.snapshot.queryParamMap.get('pid');
    const ptitle = route.snapshot.queryParamMap.get('ptitle');
    const selectedParam = route.snapshot.queryParamMap.get('selected');

    // First detect product type (pid/ptitle) so we can decide whether existing
    // gallery selections should be honoured. For custom portraits we must NOT
    // reuse previously stored gallery card selections (they're unrelated).
    if(pid){
      this.productId = pid;
      if(pid === 'custom'){
        this.isCustom = true;
        this.item = 'Custom illustration';
        this.productTitle = ptitle || this.translate.instant('order.item.custom') || 'Custom portrait';
      } else if(/bonita/i.test(pid)){
        this.isCustom = false;
        this.productTitle = ptitle || this.translate.instant('product.bonita.title') || 'No worries Bonita';
  this.item = this.productTitle || '';
        this.notes = `Product: ${this.productTitle}`;
        // Bonita pack requires selecting 5 cards — enforce minQty immediately
        // For bonita the *order* quantity is fixed to 1 (one set). The selection still requires 5 cards.
        this.quantity = 1;
        this.minQty = 1;
        // set fixed unit price for Bonita (1500 MKD converted to EUR base)
        this.unitPriceEur = this.BONITA_PRICE_MKD / 61.5;
      } else {
        // special-case the CARD product: default quantity 3 and minQty 3
        if (pid === 'card-pack'){
          this.quantity = 3;
          this.minQty = 3;
        }
        this.productTitle = ptitle || undefined;
        this.isCustom = /custom/i.test(String(ptitle || ''));
      }
    } else if(ptitle){
      this.productTitle = ptitle;
      this.isCustom = /custom/i.test(ptitle);
      if(this.isCustom) this.item = 'Custom illustration';
      else this.item = ptitle;
      this.notes = `Product: ${ptitle}`;
    }

    // Now handle incoming selection. If `selected` is provided as a query
    // parameter use that explicitly. Otherwise only load persisted gallery
    // selections when the target product is a gallery pack (e.g. Bonita or
    // card-pack). For custom portraits we clear any persisted selection to
    // avoid showing unrelated gallery cards.
    if(selectedParam){
      const arr = selectedParam.split(',').filter(x=>x);
      this.selectedCards.set(arr);
      selSvc.set(arr);
      const selCount = arr.length;
      if (selCount > 0) {
        this.quantity = Math.max(this.quantity || 1, selCount);
      }
    } else {
      // If this is a custom product, do not reuse stored gallery selections.
      if (this.isCustom || this.productId === 'custom'){
        // Clear both local signal and persisted selection so users aren't
        // surprised by stale gallery items appearing in the order form.
        this.selectedCards.set([]);
        try{ selSvc.clear(); }catch(e){}
      } else {
        this.selectedCards.set(selSvc.current());
      }
    }

  // Continue with product-based setup
  // Load product list to populate title map and find prices/minQty
    this.gallery.getProducts().subscribe(list => {
      (list || []).forEach(p => { this.titleMap[p.id] = p.title; });
      const pidToFind = this.productId;
      const found = (list || []).find(p => p.id === pidToFind || p.title === this.productTitle);
      if (found){
        // Special-case Bonita: the product is sold as a single fixed set (quantity 1) priced at BONITA_PRICE_MKD
        if (this.productId && /bonita/i.test(this.productId)){
          this.unitPriceEur = this.BONITA_PRICE_MKD / 61.5;
          // keep order quantity fixed to 1 (selection still requires 5 cards enforced elsewhere)
          this.minQty = 1;
          this.quantity = 1;
        } else {
          this.unitPriceEur = found.priceEur;
          if (found.minQty) this.minQty = found.minQty;
          // Ensure known pack minimums are enforced even if product metadata is missing
          if (this.productId && /card/i.test(this.productId)) this.minQty = Math.max(this.minQty || 1, 3);
          // If user came with selected cards, ensure the minQty reflects selected count
          const selCount = (this.selectedCards && this.selectedCards()) ? this.selectedCards().length : 0;
          if (selCount > 0) this.minQty = Math.max(this.minQty || 1, selCount);
          // Ensure the quantity input reflects minimum constraints (prefill when appropriate)
          this.quantity = Math.max(this.quantity || 1, this.minQty || 1);
        }
      } else if (pid === 'custom' || /custom/i.test(String(this.productTitle || ''))){
        const custom = (list || []).find(p => /custom/i.test(p.id) || /custom/i.test(p.title));
        if (custom) this.unitPriceEur = custom.priceEur;
      }
    });
    // load gallery mapping for selected card thumbnails
    this.gallery.getGallery().subscribe(map => { this.galleryMap = map || {}; });
    // After gallery mapping loads, if we arrived with selected cards but no pid,
    // try to reliably infer which prepack the selection belongs to by loading
    // the specific gallery JSONs for Bonita and the card pack and checking
    // whether the selected keys exist in those maps. Prefer explicit pid when
    // available; this is a best-effort fallback for cases navigation omitted pid.
    const sel = this.selectedCards && this.selectedCards() ? this.selectedCards() : [];
    if (!this.productId && sel.length > 0) {
      try{
        // Load Bonita gallery and check if all selected ids are present there
        this.gallery.getGallery('bonita-notes-pack').subscribe(bmap => {
          const bonitaMap: Record<string,string> = bmap || {};
          const allInBonita = sel.length > 0 && sel.every(id => !!bonitaMap[id]);
          if (allInBonita){
            this.productId = 'bonita-notes';
            this.productTitle = this.productTitle || this.translate.instant('product.bonita.title') || 'No worries Bonita';
            // selection still requires 5 cards, but the order quantity is a single fixed set
            this.minQty = Math.max(this.minQty || 1, 1);
            this.quantity = 1;
            // fixed unit price
            this.unitPriceEur = this.BONITA_PRICE_MKD / 61.5;
            return;
          }
          // Not all in Bonita - try card pack gallery
          this.gallery.getGallery('card-pack').subscribe(cmap => {
            const cardMap: Record<string,string> = cmap || {};
            const allInCards = sel.length > 0 && sel.every(id => !!cardMap[id]);
            if (allInCards){
              this.productId = 'card-pack';
              this.productTitle = this.productTitle || 'Card pack';
              this.minQty = Math.max(this.minQty || 1, 3);
              this.quantity = Math.max(this.quantity || 1, sel.length, this.minQty || 1);
            }
          });
        });
      }catch(e){ /* best-effort only */ }
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files);
    }
  }

  onNameInput(event: Event){
    this.nameError = null;
  }

  onEmailInput(event: Event){
    this.emailError = null;
  }

  isFormValid(): boolean{
    // required: first name, last name, address and email
    if (!this.firstName || !this.firstName.trim()) return false;
    if (!this.lastName || !this.lastName.trim()) return false;
    if (!this.address || !this.address.trim()) return false;
    if (!this.email || !this.email.trim() || !this.email.includes('@')) return false;
  // phone is required for processing
  if (!this.phone || !this.phone.trim()) return false;
    // quantity must be >= minQty
    if (!Number.isFinite(this.quantity as number) || this.quantity < (this.minQty || 1)) return false;
    // if custom portrait, must have at least one uploaded file
    if (this.isCustom && this.files.length === 0) return false;
    // if selected cards present, validate selection counts
    if (this.selectedCards().length > 0) {
      if (this.isBonita) {
        // Bonita requires exactly (or at least) 5 selected cards
        if (this.selectedCards().length < 5) return false;
      } else {
        // other packs use minQty as the selection minimum (e.g., card-pack = 3)
        if (this.selectedCards().length < (this.minQty || 1)) return false;
      }
    }
    return true;
  }

  onQtyInput(event: Event){
    const input = event.target as HTMLInputElement;
    const v = Number(input.value);
    // If user types non-numeric or less than minQty, clamp to minQty and show an inline message briefly
    if (!Number.isFinite(v) || v < (this.minQty || 1)){
      this.qtyError = this.translate.instant('order.minimum') + ' ' + (this.minQty || 1);
      // clamp model
      this.quantity = this.minQty || 1;
      // clear message after 2s
      setTimeout(()=> this.qtyError = null, 2000);
    } else {
      this.qtyError = null;
      this.quantity = Math.floor(v);
    }
  }

  format(eur: number){ return this.currency.format(eur); }

  setCurrency(c: 'EUR' | 'MKD'){
    this.currency.set(c);
  }

  currentCurrency(): 'EUR' | 'MKD'{
    return this.currency.current() as 'EUR' | 'MKD';
  }

  private createOrderCode(){
    const dt = new Date();
    const pad = (n:number)=>n.toString().padStart(2,'0');
    const code = `${dt.getUTCFullYear().toString().slice(-2)}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}-${Math.floor(Math.random()*9000+1000)}`;
    return code;
  }

  async submit(){
    this.submitting = true;
    const code = this.createOrderCode();
    // convert files to DataURLs so API can store them in-memory
    const toDataUrl = (file: File) => new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.onerror = (e) => rej(e);
      reader.readAsDataURL(file);
    });

    const uploadedFiles = await Promise.all(this.files.map(async f => ({
      name: f.name,
      contentType: f.type,
      size: f.size,
      dataUrl: await toDataUrl(f)
    })));

    // Also include any selected gallery cards as attachments (Bonita / Card pack)
    const sel = this.selectedCards();
    if (sel && sel.length > 0) {
      // helper: fetch an image URL and convert to dataURL
      const fetchToDataUrl = async (url: string) => {
        try{
          const resp = await fetch(url);
          const blob = await resp.blob();
          const name = url.split('/').pop() || `gallery-${Math.floor(Math.random()*10000)}.jpg`;
          const contentType = blob.type || 'image/jpeg';
          const size = blob.size || 0;
          return { name, contentType, size, dataUrl: await toDataUrl(new File([blob], name, { type: contentType })) };
        }catch(e){
          // ignore individual fetch failures
          return null;
        }
      };

      const galleryFiles = await Promise.all(sel.map(async id => {
        const url = this.getGalleryPath(id);
        return await fetchToDataUrl(url);
      }));
      // filter out failed fetches and append
      for(const gf of (galleryFiles || [])){
        if(gf) uploadedFiles.push(gf as any);
      }
    }

    // Build localized previews for selected gallery keys
    const selectedPreviews = this.selectedCards().map(id => {
      const key = this.mapPtitleKey(id);
      // If key maps to a product title translation key, resolve localized string; otherwise fallback to '#id'
      const localized = key ? this.translate.instant(key) : `#${id}`;
      return { id, title: localized, image: this.getGalleryPath(id) };
    });

    const order: TrackedOrder = {
      code,
      firstName: this.firstName,
      lastName: this.lastName,
      address: this.address,
      email: this.email,
      phone: this.phone,
      instagram: this.instagram,
      isCustomPortrait: this.isCustom,
      productId: this.productId,
      productTitle: this.productTitle,
      // include selected card ids and localized preview objects so server can store which cards were ordered
      selectedCardIds: this.selectedCards(),
      selectedCards: selectedPreviews,
      quantity: this.quantity,
      notes: this.notes,
      uploadedFiles
    };
    this.orders.create(order).subscribe({
      next: ()=>{
        this.orderCode.set(code);
        // clear form fields but keep the code visible for user copy
        this.firstName = '';
        this.lastName = '';
        this.address = '';
        this.email = '';
        this.phone = undefined;
        this.instagram = undefined;
        this.notes = undefined;
        this.files = [];
        // clear the native file input so browser UI resets
        try { if (this.fileInput && this.fileInput.nativeElement) this.fileInput.nativeElement.value = ''; } catch(e) {}
        this.selectedCards.set([]);
        this.submitting = false;
      },
      error: (err: any) =>{
        // Try to parse structured JSON error from API
        try{
          // HttpErrorResponse typically has `error` property containing the payload
          const payload = err && err.error ? err.error : null;
          if (payload && typeof payload === 'object'){
            // Prefer explicit error field, fall back to message
            this.serverError = payload.error || payload.message || JSON.stringify(payload);
          } else if (err && err.message){
            this.serverError = err.message;
          } else {
            this.serverError = 'An unknown error occurred';
          }
        }catch(e){
          this.serverError = 'An unknown error occurred';
        }
        this.submitting = false;
      }
    });
  }

  copyCode(){
    const code = this.orderCode();
    if(!code) return;

    // Try a synchronous copy via a hidden textarea (most reliable on a user click)
    try{
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        this.copied = true;
        setTimeout(()=> this.copied = false, 2500);
        return;
      }
    }catch(e){ /* ignore and try async API next */ }

    // Try the async Clipboard API as a fallback
    (async ()=>{
      try{
        if (navigator && (navigator as any).clipboard && typeof (navigator as any).clipboard.writeText === 'function'){
          await (navigator as any).clipboard.writeText(code);
          this.copied = true;
          setTimeout(()=> this.copied = false, 2500);
          return;
        }
      }catch(e){ /* ignore */ }

      // Final fallback: prompt the user to copy manually
      try{
        const promptLabel = this.translate.instant('order.copyPrompt') || 'Copy this code';
        // window.prompt is synchronous and will allow the user to ctrl-c
        window.prompt(promptLabel, code);
      }catch(e){ /* ignore */ }
    })();
  }

  requestRemove(id: string){
    this.pendingRemoveId.set(id);
    this.showRemoveModal.set(true);
  }

  confirmRemove(){
    const id = this.pendingRemoveId();
    if (!id) return;
    this.showRemoveModal.set(false);
    this.pendingRemoveId.set(null);
    // perform actual removal (no further confirmation)
    this.removeSelected(id);
  }

  cancelRemove(){
    this.showRemoveModal.set(false);
    this.pendingRemoveId.set(null);
  }

  removeSelected(id: string){
    // remove from selection service and update local signal
    this.selection.remove(id);
    const current = this.selection.current() || [];
    this.selectedCards.set(current);

    // If this product requires a minimum selection (Bonita needs 5, card-pack needs 3)
    // and the user removed one => send them back to the gallery to pick another.
    const remaining = current.length;
    const needs = this.isBonita ? 5 : (this.productId && /card/i.test(String(this.productId)) ? 3 : (this.minQty || 1));
    if (remaining < needs) {
      // navigate back to gallery selection for the corresponding target and
      // pass along the remaining selected ids so the gallery can prepopulate them
      const target = this.isBonita ? 'bonita-notes-pack' : 'card-pack';
      const q: any = { target };
      if (remaining > 0) q.selected = current.join(',');
      // Navigate back so user can pick the missing items. Use replaceUrl to
      // avoid piling up history entries when they keep removing.
      this.router.navigate(['/gallery'], { queryParams: q });
    }
  }

  getGalleryPath(id: string){
    const p = this.galleryMap[id];
    if (!p) return '';
    let rel = p;
    if (!rel.startsWith('gallery/') && !rel.startsWith('/')) rel = 'gallery/' + rel;
    const base = document.querySelector('base')?.getAttribute('href') || '/';
    if (base === '/') return '/' + rel.replace(/^\/+/, '');
    const normalizedBase = base.endsWith('/') ? base.slice(0,-1) : base;
    return normalizedBase + '/' + rel.replace(/^\/+/, '');
  }

  // Map gallery numeric keys to product title translation keys when applicable
  mapPtitleKey(k: string){
    if(k === '1') return 'product.bonita.title';
    if(k === '2') return 'product.card.title';
    if(k === '3') return 'product.custom.title';
    return '';
  }

  get displayTitle(): string{
    // Prefer an explicit productTitle when present
    if (this.productTitle && String(this.productTitle).trim()) return this.productTitle as string;
    // Fall back to productId-aware translated titles or known titleMap entries
    if (this.productId){
      try{
        if (/bonita/i.test(this.productId)) return this.translate.instant('product.bonita.title') || 'No worries Bonita';
        if (/card/i.test(this.productId)) return this.translate.instant('product.card.title') || 'Card pack';
        if (this.productId === 'custom') return this.translate.instant('order.item.custom') || 'Custom portrait';
        const t = this.titleMap[this.productId];
        if (t) return t;
      }catch(e){ /* ignore translation failures */ }
    }
    // Last resort
    return this.translate.instant('product.bonita.title') || 'No worries Bonita';
  }

  get isBonita(): boolean{
    return !!this.productId && /bonita/i.test(this.productId);
  }
}
