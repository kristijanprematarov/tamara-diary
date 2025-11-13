import { Component, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { OrdersService } from '../order/orders.service';
import { Router } from '@angular/router';

@Component({
  selector: 'td-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div *ngIf="isAuthorized()">
      <h1 class="mb-4">{{ 'admin.panel' | translate }}</h1>
      <form (ngSubmit)="load()" class="form">
        <input [(ngModel)]="code" name="code" [placeholder]="('admin.placeholder.code' | translate)" class="form-control form-control-lg" />
        <button class="btn btn-primary ms-2">{{ 'admin.load' | translate }}</button>
      </form>
      <div *ngIf="order() as o" class="card mt-4">
        <div class="muted small mb-2">{{ 'admin.order' | translate }} <b>{{ o.code }}</b> • {{ o.createdUtc | date:'dd/MM/yyyy HH:mm' }}</div>
  <div *ngIf="getProductTitle(o)" class="muted small mb-2">{{ 'admin.orderedProduct' | translate }}: <b>{{ getProductTitle(o) }}</b></div>
        <div class="row">
          <div class="col-md-7">
            <div class="grid">
              <label>{{ 'admin.statusLabel' | translate }}
                <select [(ngModel)]="o.status" name="status" class="form-select">
                  <option [ngValue]="0">{{ 'status.created' | translate }}</option>
                  <option [ngValue]="1">{{ 'status.accepted' | translate }}</option>
                  <option [ngValue]="2">{{ 'status.inprogress' | translate }}</option>
                  <option [ngValue]="3">{{ 'status.packaging' | translate }}</option>
                  <option [ngValue]="4">{{ 'status.delivering' | translate }}</option>
                  <option [ngValue]="5">{{ 'status.delivered' | translate }}</option>
                  <option [ngValue]="6">{{ 'status.rejected' | translate }}</option>
                </select>
              </label>
              <label>{{ 'admin.estimatedDelivery' | translate }}
                <input [(ngModel)]="etaSingle" name="etaSingle" [placeholder]="('admin.placeholder.date' | translate)" class="form-control" />
              </label>
            </div>
            <div class="mt">
              <div *ngIf="o.status === 6" class="mb-2">
                <label class="form-label small">{{ 'admin.rejectionReason' | translate }}</label>
                <textarea [(ngModel)]="rejectionNote" name="rejectionNote" class="form-control" rows="3"></textarea>
              </div>
              <button class="btn btn-success" (click)="saveStatus(o.status)">{{ 'admin.saveStatus' | translate }}</button>
            </div>
            <div class="mt-3">
                <h5>{{ 'admin.logs' | translate }}</h5>
                <div *ngIf="o.logs?.length; else noLogs" class="mt-3">
                  <div class="list-group">
                    <div class="list-group-item py-2 px-3" *ngFor="let log of sortedLogs(o.logs)">
                      <div class="d-flex justify-content-between align-items-center">
                        <div class="fw-semibold">{{ mapLogLabel(log) | translate }} <span *ngIf="!isStatusLabel(mapLogLabel(log)) && log.newStatus !== undefined" class="badge bg-light text-dark ms-1">{{ statusLabelFor(log.newStatus) | translate }}</span></div>
                    
                        <div class="small text-muted">{{ log.timestampUtc | date:'dd/MM/yyyy HH:mm' }}</div>
                      </div>
                      <div *ngIf="hasLogNote(log)" class="small mt-1">{{ renderLogNote(log) }}</div>
                    </div>
                  </div>
                </div>
              <ng-template #noLogs>
                <div class="form-text small">{{ 'admin.noLogs' | translate }}</div>
              </ng-template>
            </div>
          </div>
          <div class="col-md-5">
            <div class="mb-3">
              <div class="fw-semibold">{{ 'track.customer' | translate }}</div>
              <div class="small muted">{{ (o.firstName || '') + ' ' + (o.lastName || '') }} <span *ngIf="o.email">• {{ o.email }}</span> <span *ngIf="o.phone">• {{ o.phone }}</span></div>
              <div *ngIf="o.address" class="mt-2">
                <div class="form-text small text-muted">{{ 'order.address' | translate }}</div>
                <div class="small">{{ o.address }}</div>
              </div>
              <div *ngIf="o.instagram" class="mt-1 small muted">Instagram: {{ o.instagram }}</div>
            </div>
            <div *ngIf="o.uploadedFiles?.length" class="mb-2">
              <h5>{{ 'admin.uploadedPhotos' | translate }}</h5>
              <div class="d-flex flex-wrap gap-2">
                <div *ngFor="let f of o.uploadedFiles; let i = index" class="border rounded p-2 bg-light">
                  <div class="small">{{ f.name }}</div>
                  <a [href]="f.dataUrl" target="_blank" rel="noopener">
                    <img [src]="f.dataUrl" [alt]="('admin.photoAlt' | translate)" style="max-width:120px;max-height:120px;object-fit:cover;" />
                  </a>
                  <div style="margin-top:.5rem">
                    <a [href]="f.dataUrl" [attr.download]="f.name" class="btn btn-sm btn-outline-secondary">{{ 'admin.download' | translate }}</a>
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="o.selectedCards?.length" class="mb-3">
              <h5>{{ 'track.selectedCards' | translate }}</h5>
              <div class="d-flex flex-wrap gap-2">
                <div *ngFor="let c of o.selectedCards" class="border rounded p-2 bg-light" style="max-width:140px">
                  <div class="small">{{ c.title || c.id }}</div>
                  <a *ngIf="c.image" [href]="c.image" target="_blank" rel="noopener">
                    <img [src]="c.image" [alt]="c.title || c.id" style="max-width:120px;max-height:120px;object-fit:cover;" />
                  </a>
                  <div class="muted xsmall">ID: {{ c.id }}</div>
                </div>
              </div>
            </div>
            <div class="mt-3">
              <label class="form-label small">{{ 'admin.uploadLabel' | translate }}</label>
              <input type="file" (change)="onAdminFilesSelected($event)" multiple accept="image/*,.pdf" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form{display:flex;gap:.5rem;max-width:520px}
    .card{max-width:900px;border:1px solid rgba(0,0,0,0.04);padding:1.5rem;border-radius:12px;margin-top:1rem;box-shadow:0 6px 24px rgba(0,0,0,0.06)}
    .grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:.5rem}
    label{display:flex;flex-direction:column;gap:.25rem}
    input,select{padding:.4rem;border:1px solid rgba(0,0,0,0.06);border-radius:6px}
    .muted{color:var(--brand-dark, #666)}
    .small{font-size:.875rem}
    .mt{margin-top:.75rem}
    .row{display:flex;gap:2rem;flex-wrap:wrap}
    .col-md-7{flex:2}
    .col-md-5{flex:1}
    img{border:1px solid #ccc;border-radius:8px}
    /* Make action buttons follow brand style when possible */
    .btn-primary{background:var(--brand-primary);border-color:var(--brand-primary);color:#fff}
    .btn-success{background:linear-gradient(90deg,var(--brand-primary-dark,#d66596),var(--brand-primary,#e37aa9));border-color:var(--brand-primary-dark);color:#fff}
  `]
})
export class AdminComponent {
  code = '';
  order = signal<any | null>(null);
  etaSingle?: string;
  etaStart?: string;
  etaEnd?: string;
  rejectionNote: string = '';
  passcode: string = '';
  passcodeError: boolean = false;
  private orders = inject(OrdersService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  adminFiles: File[] = [];

  constructor(){
    // If user is not authorized redirect to the dedicated gateway page which shows the
    // minimal passcode UI. This keeps the admin component focused on admin work only.
    if (!this.isAuthorized()) {
      this.router.navigate(['/admin-gateway']);
    }
  }
  isAuthorized() {
    return localStorage.getItem('tamara-admin') === 'true';
  }
  goGateway() {
    this.router.navigate(['/admin-gateway']);
  }

  unlock(event: Event) {
    event.preventDefault();
    // Keep passcode in sync with gateway (avoid hardcoding in multiple places in a real app)
    const CORRECT = 'Strmosh3#';
    if (this.passcode === CORRECT) {
      localStorage.setItem('tamara-admin', 'true');
      // reload to make the authenticated UI appear
      window.location.reload();
    } else {
      this.passcodeError = true;
      setTimeout(() => this.passcodeError = false, 2500);
    }
  }

  async load(){
    const code = this.code.trim();
    if(!code) { this.order.set(null); return; }
    this.orders.get(code).subscribe({
      next: (o)=>{
        this.order.set(o);
        const dt = (s?:string)=> s? new Date(s) : undefined;
        const fmt = (d?:Date)=> d? `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCFullYear()}`: undefined;
        this.etaSingle = fmt(dt(o.estimatedDeliveryUtc));
      },
      error: ()=> this.order.set(null)
    });
  }

  onAdminFilesSelected(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files) this.adminFiles = Array.from(input.files);
  }

  async uploadAdminFiles(){
    const code = this.order()?.code;
    if(!code || !this.adminFiles.length) return;
    // convert to dataUrls
    const toDataUrl = (file: File) => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = ()=> res(String(r.result));
      r.onerror = e => rej(e);
      r.readAsDataURL(file);
    });
    const files = await Promise.all(this.adminFiles.map(async f => ({ name: f.name, contentType: f.type, size: f.size, dataUrl: await toDataUrl(f) })));
    this.orders.addFiles(code, files).subscribe({ next: ()=> { this.adminFiles = []; this.load(); }, error: ()=> { /* ignore */ } });
  }

  private parseDdMmYyyy(v?: string): string | null {
    if(!v) return null;
    const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(!m) return null;
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Date.UTC(parseInt(yyyy), parseInt(mm)-1, parseInt(dd)));
    return d.toISOString();
  }

  async saveStatus(status: number){
    const code = this.order()?.code;
    if(!code) return;
    // When rejecting, provide the admin-entered reason
    const note = status === 6 ? this.rejectionNote : undefined;
    await this.orders.updateStatus(code, status, note, 'admin').toPromise();
    const startUtc = this.parseDdMmYyyy(this.etaSingle);
    const endUtc = null;
    await this.orders.updateEta(code, startUtc, endUtc, 'admin').toPromise();
    await this.load();
  }

  renderLogNote(l: any){
    // Look for note in multiple possible locations
    const candidate = l?.note || l?.Note || l?.noteKey || l?.NoteKey || l?.message || l?.Message || (l?.data && l.data.note) || null;
    if (!candidate) return '';
    try {
      if (typeof candidate === 'string'){
        // If it looks like a translation key try to resolve it. Prefer any provided params (NoteParams)
        const params = l?.noteParams || l?.NoteParams || l?.noteparams || l?.Noteparams || null;
        if (candidate.indexOf('.') > -1){
          // First attempt: exact key with params
          const exact = params ? this.translate.instant(candidate, params) : this.translate.instant(candidate);
          if (typeof exact === 'string' && exact !== candidate) return exact;
          // If exact resolved to an object (parent key), try the .note child
          if (typeof exact !== 'string'){
            const noteKey = candidate.endsWith('.note') ? candidate : (candidate + '.note');
            const tNote = params ? this.translate.instant(noteKey, params) : this.translate.instant(noteKey);
            if (typeof tNote === 'string' && tNote !== noteKey) return tNote;
          }

          // Try common variants: parent.status.note and parent.note
          const parts = candidate.split('.');
          if (parts.length >= 2){
            const parent = parts.slice(0,2).join('.');
            const parentNote = parent + '.note';
            const tParentNote = params ? this.translate.instant(parentNote, params) : this.translate.instant(parentNote);
            if (typeof tParentNote === 'string' && tParentNote !== parentNote) return tParentNote;
            const tParent = params ? this.translate.instant(parent, params) : this.translate.instant(parent);
            if (typeof tParent === 'string' && tParent !== parent) return tParent;
          }
        }
        // last-resort return the raw string (or formatted date/range if necessary)
        return candidate;
      }
    } catch(e){}
    return '';
  }

  hasLogNote(l: any){
    if (!l) return false;
    const candidate = l?.note || l?.Note || l?.noteKey || l?.NoteKey || l?.message || l?.Message || (l?.data && l.data.note) || null;
    return !!candidate;
  }

  sortedLogs(logs?: any[]){
    return (logs || []).slice().sort((a,b)=> new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime());
  }

  isStatusLabel(key: any){
    try{
      return typeof key === 'string' && key.indexOf('status.') === 0;
    }catch{
      return false;
    }
  }

  // Map raw log event to a translation key (or status label key when available)
  mapLogLabel(l: any){
    const ev = (l && (l.event || l.Event || l.type)) ? (l.event || l.Event || l.type) : '';
    // Standard events
    switch(String(ev)){
      case 'Created': return 'log.created';
      case 'Rejected': return 'log.rejected';
      case 'EtaUpdated': return 'log.etaUpdated';
      case 'EtaUpdatedUtc': return 'log.etaUpdated';
    }
    // Try to detect a status numeric value in several common properties
    const nsCandidates = [l?.newStatus, l?.NewStatus, l?.newstatus, l?.status, l?.Status, l?.value, l?.Value, l?.new_state, l?.newState];
    for(const cand of nsCandidates){
      if (cand !== undefined && cand !== null){
        const n = Number(cand);
        if (!isNaN(n)) return this.statusLabelFor(n);
      }
    }
    // If note contains a status key like 'status.packaging' use that
    const noteStr = (l && (l.note || l.Note || l.message || l.Message || l.data?.note)) ? (l.note || l.Note || l.message || l.Message || l.data?.note) : null;
    if (typeof noteStr === 'string' && noteStr.indexOf('status.') === 0){
      // If note is a full note key (e.g. status.customPortraitOrder.note) try to map to parent status if possible
      const parts = noteStr.split('.');
      if (parts.length >= 2){
        // try to map to a real status label like 'status.packaging' if it exists; otherwise fall back to generic
        const candidateKey = 'status.' + parts[1];
        const resolved = this.translate.instant(candidateKey);
        if (typeof resolved === 'string' && resolved !== candidateKey) return candidateKey;
        return 'log.statusChanged';
      }
    }
    // Fallback to generic label
    return 'log.statusChanged';
  }

  statusLabelFor(s?: number){
    switch(s){
      case 0: return 'status.created';
      case 1: return 'status.accepted';
  case 2: return 'status.inprogress';
      case 3: return 'status.packaging';
      case 4: return 'status.delivering';
      case 5: return 'status.delivered';
      case 6: return 'status.rejected';
      default: return 'status.created';
    }
  }

  getProductTitle(o: any): string | null{
    if (!o) return null;
    // Prefer explicit productTitle returned by the server
    if (o.productTitle && String(o.productTitle).trim()) return o.productTitle;
    // If productId exists, map to known translation keys
    try{
      const pid = String(o.productId || '').toLowerCase();
      if (pid.indexOf('bonita') > -1) return this.translate.instant('product.bonita.title');
      if (pid.indexOf('card') > -1) return this.translate.instant('product.card.title');
      if (pid.indexOf('custom') > -1) return this.translate.instant('order.item.custom');
    }catch(e){ /* ignore */ }
    // If selected card ids exist, try to infer from their ids (1 => bonita, 2 => card, 3 => custom)
    const sel = o.selectedCardIds || (o.selectedCards ? o.selectedCards.map((c:any)=>c.id) : null);
    if (sel && Array.isArray(sel) && sel.length>0){
      if (sel.indexOf('1') > -1) return this.translate.instant('product.bonita.title');
      if (sel.indexOf('2') > -1) return this.translate.instant('product.card.title');
      if (sel.indexOf('3') > -1) return this.translate.instant('order.item.custom');
    }
    return null;
  }
}
