import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OrdersService, TrackedOrder } from '../order/orders.service';

@Component({
  selector: 'td-track',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
  <div class="track-root">
    <div class="card track-card">
      <h1 class="track-title">{{ 'track.title' | translate }}</h1>
      <form (ngSubmit)="lookup()" class="track-form">
        <div class="input-group">
          <input [(ngModel)]="code" name="code" class="form-control" [placeholder]="('track.placeholder' | translate)" />
          <button class="btn btn-primary" type="submit" [disabled]="searching()">
            <span *ngIf="searching()" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {{ 'track.button' | translate }}
          </button>
        </div>
      </form>
      <div *ngIf="notFound()" class="alert alert-danger mt-2">{{ 'track.notFound' | translate }}</div>
    </div>

    <div *ngIf="order() as o" class="card track-result">
      <div class="result-top row">
        <img *ngIf="o.productImage" [src]="o.productImage" [alt]="('track.coverAlt' | translate)" />
        <div class="meta">
          <div class="bold">{{ o.productTitle }}</div>
          <div class="muted small">{{ o.code }} • {{ o.createdUtc | date:'dd/MM/yyyy' }}</div>
        </div>
      </div>
      <hr />
      <div class="mb-3">
        <div class="fw-semibold">{{ 'track.customer' | translate }}</div>
        <div class="small muted">{{ (o.firstName || '') + ' ' + (o.lastName || '') }} <span *ngIf="o.email">• {{ o.email }}</span> <span *ngIf="o.phone">• {{ o.phone }}</span></div>
        <div *ngIf="o.address" class="mt-2">
          <div class="small muted">{{ 'order.address' | translate }}</div>
          <div class="small">{{ o.address }}</div>
        </div>
      </div>

      <!-- Selected cards preview (for TamaraDiary card orders) -->
      <div *ngIf="o.selectedCards?.length" class="selected-cards mt-3">
        <div class="fw-semibold">{{ 'track.selectedCards' | translate }}</div>
        <div class="selected-cards-grid d-flex gap-2 flex-wrap mt-2">
          <div *ngFor="let c of o.selectedCards" class="selected-card p-2">
            <img *ngIf="c.image" [src]="c.image" [alt]="c.title || c.id" class="selected-card-img" />
            <div class="small mt-1">{{ c.title || c.id }}</div>
            <div class="muted xsmall">ID: {{ c.id }}</div>
          </div>
        </div>
      </div>

      <ul class="timeline list-unstyled m-0">
        <li *ngFor="let s of statuses" class="d-flex align-items-center mb-2">
          <i class="bi" [ngClass]="((o.status ?? 0) >= s.value) ? 'bi-check-circle-fill text-success me-2' : 'bi-circle me-2'"></i>
          <span [class.text-muted]="!((o.status ?? 0) >= s.value)">{{ s.label | translate }}</span>
        </li>
      </ul>

  <div *ngIf="(o.status ?? 0) === 4 && o.rejectionReason" class="alert alert-warning mt-3">{{ o.rejectionReason }}</div>

      <div class="mt-3">
        <div class="fw-semibold">{{ 'track.estimated' | translate }}</div>
        <div *ngIf="o.estimatedDeliveryStartUtc || o.estimatedDeliveryUtc; else etaMissing">
          <ng-container *ngIf="o.estimatedDeliveryStartUtc && o.estimatedDeliveryEndUtc; else etaSingle">
            <div>{{ 'track.estimatedBetween' | translate }} {{ o.estimatedDeliveryStartUtc | date:'dd/MM/yyyy' }} {{ 'track.estimatedAnd' | translate }} {{ o.estimatedDeliveryEndUtc | date:'dd/MM/yyyy' }}</div>
          </ng-container>
          <ng-template #etaSingle>
            <div>{{ 'track.estimatedOn' | translate }} {{ (o.estimatedDeliveryUtc || o.estimatedDeliveryStartUtc) | date:'dd/MM/yyyy' }}</div>
          </ng-template>
        </div>
        <ng-template #etaMissing>
          <div class="text-muted">{{ 'track.etaMissing' | translate }}</div>
        </ng-template>
      </div>

      <div *ngIf="o.logs?.length" class="mt-3">
        <div class="fw-semibold">{{ 'track.logs' | translate }}</div>
          <div class="list-group">
          <div class="list-group-item py-2 px-3" *ngFor="let log of sortedLogs(o.logs)">
            <div class="d-flex justify-content-between align-items-center">
              <div class="fw-semibold">{{ mapLogLabel(log) | translate }} <span *ngIf="!isStatusLabel(mapLogLabel(log)) && log.newStatus !== undefined" class="badge bg-light text-dark ms-1">{{ statusLabelFor(log.newStatus) | translate }}</span></div>
              <div class="small text-muted">{{ log.timestampUtc | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
            <div *ngIf="log.note" class="small mt-1">{{ renderLogNote(log) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .track-root{display:flex;flex-direction:column;align-items:center;width:100%;max-width:1100px;margin:0 auto;padding-top:1.5rem}
    .track-card{width:100%;background:var(--brand-accent);border-radius:1rem;box-shadow:0 2px 14px rgba(227,122,169,.08);padding:1.25rem;margin-bottom:1rem}
    .track-title{margin:0 0 .5rem 0;font-size:1.25rem}
    .track-form{display:flex;flex-direction:column;gap:.5rem;max-width:720px}
    .input-group{display:flex;gap:.5rem;align-items:center}
    .form-control{padding:.6rem;border:1px solid #ddd;border-radius:6px;width:100%}
    .btn{padding:.5rem .8rem;border-radius:6px;border:1px solid transparent}
    .btn-primary{background:var(--brand-primary);border-color:var(--brand-primary);color:#fff}
    .card{max-width:720px;border:0;padding:1rem;border-radius:8px;margin-top:1rem}
    .row{display:flex;gap:.75rem;align-items:center}
    .result-top{align-items:flex-start}
    img{width:72px;height:72px;object-fit:cover;border-radius:6px}
    .meta{display:flex;flex-direction:column;gap:.25rem}
    .bold{font-weight:600}
    .muted{color:#666}
    .small{font-size:.875rem}
    .badge{background:#eee;border-radius:999px;padding:.1rem .5rem;margin-left:.4rem}
    .status-row{display:flex;gap:.5rem;align-items:center;margin-top:.4rem}
    .status-label{font-size:.85rem;color:#666}
    .status-value{font-weight:700}
    .eta{margin-top:.3rem}

    /* timeline */
    .timeline{margin-top:1rem;padding-top:.25rem}
    .timeline-header{margin-bottom:.5rem}
    .timeline-list{display:flex;flex-direction:column;gap:.5rem}
    .timeline-item{display:flex;gap:.75rem;align-items:flex-start}
    .timeline-marker{width:18px;flex:0 0 18px;text-align:center;color:#ccc;margin-top:6px}
    .timeline-marker.active{color:var(--brand-primary)}
    .timeline-body{flex:1;border-left:1px dashed #eee;padding-left:.75rem}
    .timeline-body .time{margin-bottom:.25rem}
    .event{margin-bottom:.2rem}
    .note{font-size:.9rem}
    .selected-cards-grid{display:flex;gap:.5rem}
    .selected-card{width:120px;border:1px solid #f0f0f0;border-radius:8px;padding:.5rem;background:#fff}
    .selected-card-img{width:100%;height:70px;object-fit:cover;border-radius:6px}
    .xsmall{font-size:.75rem}
  `]
})
export class TrackComponent {
  code = '';
  order = signal<TrackedOrder | null>(null);
  searching = signal(false);
  private orders = inject(OrdersService);
  private translate = inject(TranslateService);

  isStatusLabel(key: any){
    try{ return typeof key === 'string' && key.indexOf('status.') === 0; }catch{ return false; }
  }

  // status values mirror the API OrderStatus enum
  statuses = [
    { value: 0, label: 'status.created' },
    { value: 1, label: 'status.accepted' },
    { value: 2, label: 'status.inprogress' },
    { value: 3, label: 'status.packaging' },
    { value: 4, label: 'status.delivering' },
    { value: 5, label: 'status.delivered' },
    { value: 6, label: 'status.rejected' }
  ];

  notFound = signal(false);

  lookup(){
    const code = this.code.trim();
    this.notFound.set(false);
    if(!code) { this.order.set(null); return; }
    this.searching.set(true);
    this.orders.get(code).subscribe({
      next: (o)=> { this.order.set(o); this.searching.set(false); this.notFound.set(false); },
      error: (err:any)=> {
        this.order.set(null);
        this.searching.set(false);
        if(err && err.status === 404){
          this.notFound.set(true);
        } else {
          // For other errors, show the same not found message as a fallback
          this.notFound.set(true);
        }
      }
    });
  }

  sortedLogs(logs?: any[]){
    return (logs || []).slice().sort((a,b)=> new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime());
  }

  mapLogLabel(l: any){
    const ev = (l && (l.event || l.Event || l.type)) ? (l.event || l.Event || l.type) : '';
    switch(String(ev)){
      case 'Created': return 'log.created';
      case 'Rejected': return 'log.rejected';
      case 'EtaUpdated': return 'log.etaUpdated';
      case 'EtaUpdatedUtc': return 'log.etaUpdated';
    }
    const nsCandidates = [l?.newStatus, l?.NewStatus, l?.newstatus, l?.status, l?.Status, l?.value, l?.Value, l?.new_state, l?.newState];
    for(const cand of nsCandidates){
      if (cand !== undefined && cand !== null){
        const n = Number(cand);
        if (!isNaN(n)) return this.statusLabelFor(n);
      }
    }
    const noteStr = (l && (l.note || l.Note || l.message || l.Message || l.data?.note)) ? (l.note || l.Note || l.message || l.Message || l.data?.note) : null;
    if (typeof noteStr === 'string' && noteStr.indexOf('status.') === 0){
      const parts = noteStr.split('.');
      if (parts.length >= 2){
        const candidateKey = 'status.' + parts[1];
        const resolved = this.translate.instant(candidateKey);
        if (typeof resolved === 'string' && resolved !== candidateKey) return candidateKey;
        return 'log.statusChanged';
      }
    }
    return 'log.statusChanged';
  }

  renderLogNote(l: any){
    const candidate = l?.note || l?.Note || l?.noteKey || l?.NoteKey || l?.message || l?.Message || (l?.data && l.data.note) || null;
    if (!candidate) return '';
    try {
      if (typeof candidate === 'string'){
        if (candidate.indexOf('.') > -1){
          // detect any provided translation params on the log (NoteParams / noteParams / noteparams)
          const params = l?.noteParams || l?.NoteParams || l?.noteparams || l?.Noteparams || null;
          // First, try exact key with params if available
          const exact = params ? this.translate.instant(candidate, params) : this.translate.instant(candidate);
          if (typeof exact === 'string' && exact !== candidate) return exact;
          // If exact yields an object or didn't resolve, try candidate + '.note'
          const noteKey = candidate.endsWith('.note') ? candidate : (candidate + '.note');
          const tNote = params ? this.translate.instant(noteKey, params) : this.translate.instant(noteKey);
          if (typeof tNote === 'string' && tNote !== noteKey) return tNote;

          // Try parent keys like 'status.customPortraitOrder.note' and 'status.customPortraitOrder'
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
        // Fallback: if it's a date or text, format accordingly
        const formatted = this.formatNote(candidate);
        if (formatted) return formatted;
        return candidate;
      }
    } catch(e){}
    return '';
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

  formatNote(note?: string){
    if(!note) return '';
    const n = note.trim();
    if(!n) return '';
    // If note contains a range like yyyy-MM-dd..yyyy-MM-dd
    if(n.includes('..')){
      const parts = n.split('..').map(p=>p.trim()).filter(p=>p);
      if(parts.length === 2){
        const d1 = new Date(parts[0]);
        const d2 = new Date(parts[1]);
        if(!isNaN(d1.getTime()) && !isNaN(d2.getTime())){
          return `between ${this.formatDate(d1)} and ${this.formatDate(d2)}`;
        }
      }
    }
    // If single date string
    const d = new Date(n);
    if(!isNaN(d.getTime())) return this.formatDate(d);
    return n;
  }

  private formatDate(d: Date){
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
