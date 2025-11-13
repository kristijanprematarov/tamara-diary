import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GalleryService } from '../shop/gallery.service';
import { SelectionService } from '../../services/selection.service';
import { Router, ActivatedRoute, NavigationStart } from '@angular/router';

@Component({
  selector: 'td-gallery',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="gallery-page">
      <div class="card gallery-card">
  <h1 class="gallery-title">{{ 'gallery.title' | translate }}</h1>
        <!-- Bonita product info (shown when opening gallery?target=bonita-notes-pack) -->
        <div *ngIf="target() === 'bonita-notes-pack'" class="gallery-bonita-info">
          <p class="bonita-lead">{{ 'gallery.bonitaTitle' | translate }}</p>
          <p class="bonita-desc">{{ 'gallery.bonitaDesc' | translate }}</p>
          <ul class="bonita-list">
            <li>🧁 {{ 'gallery.bonitaItem1' | translate }}</li>
            <li>🧁 {{ 'gallery.bonitaItem2' | translate }}</li>
            <li>🧁 {{ 'gallery.bonitaItem3' | translate }}</li>
          </ul>
        </div>
        <div *ngIf="!entries()" class="muted gallery-loading">{{ 'common.loading' | translate }}</div>
        <div style="display:flex;gap:.5rem;justify-content:center;margin-bottom:1rem">
          <button class="btn" (click)="toggleSelectionMode()">{{ selectionMode() ? ('gallery.exitSelect' | translate) : ('gallery.selectCards' | translate) }}</button>
          <div *ngIf="selectionMode()" style="align-self:center">{{ 'gallery.selected' | translate:{n: selectedCount()} }}</div>
          <button *ngIf="selectionMode()" class="btn btn-primary order-selected" [disabled]="selectedCount() < minPack()" (click)="orderSelected()">{{ 'gallery.orderSelected' | translate }}</button>
        </div>
        <div *ngIf="entries() as e" class="gallery-grid">
          <div class="gallery-item card" *ngFor="let kv of e"
            role="button"
            tabindex="0"
            [attr.title]="'ID ' + kv.key"
            (click)="onCardClick(kv.key, $event)"
            (keydown.enter)="onCardClick(kv.key, $event)"
            [class.selectable]="selectionMode()"
            [class.selected]="isSelected(kv.key)">
            <div class="overlay" *ngIf="selectionMode()">
              <div class="select-indicator" [class.checked]="isSelected(kv.key)"></div>
            </div>
              <!-- Eye icon (top-left) to open preview without toggling selection -->
              <button class="view-eye" (click)="onViewClick(kv.key, $event)" aria-label="{{ 'gallery.clickToView' | translate }}">
                <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
                  <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                </svg>
              </button>
            <img [src]="kv.path" [alt]="'Gallery item ' + kv.key" loading="lazy" />
            <div class="card-content">
              <div class="gallery-id">#{{ kv.key }}</div>
              <div class="gallery-meta">
                <small class="muted">{{ 'gallery.clickToView' | translate }}</small>
              </div>
            </div>
          </div>
        </div>
  <div *ngIf="entries() !== null && (entries()?.length === 0)" class="muted" style="margin-top:1rem">No items found in the gallery.</div>
      <!-- Preview modal -->
      <div *ngIf="preview()" class="preview-overlay" (click)="closePreview()" tabindex="0" (keydown)="onPreviewKey($event)">
        <div class="preview-content" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <img [src]="preview()!.path" [alt]="'Preview ' + preview()!.key" />
          <div class="preview-actions">
            <button class="btn preview-close" (click)="closePreview()">{{ 'gallery.exitSelect' | translate }}</button>
            <button class="btn btn-primary" (click)="selectFromPreview()">{{ 'gallery.selectThis' | translate }}</button>
          </div>
        </div>
      </div>
      </div>
    </div>
  `,
  styles: [`
    .gallery-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: 60vh;
      width: 100%;
      /* allow gallery to expand on wide screens so cards are visible on large desktops */
      max-width: 1400px;
      margin: 0 auto;
      padding-top: 2rem;
    }
    .gallery-card {
      background: var(--brand-accent);
      border-radius: 1rem;
      box-shadow: 0 2px 14px rgba(227,122,169,.08);
      padding: 2rem 2rem 1.5rem 2rem;
      width: 100%;
      margin-bottom: 2rem;
    }
    .gallery-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 2rem;
      letter-spacing: -0.04em;
      color: var(--brand-dark);
      text-align: center;
    }
    .gallery-loading {
      margin-top: 2rem;
      font-size: 1.2rem;
      color: #888;
    }
    .gallery-grid {
      display: flex;
      /* Let cards share available space evenly without hardcoded px widths. */
      gap: 2rem;
      align-items: stretch; /* ensure cards match heights */
      width: 100%;
      margin-top: 1rem;
  /* allow wrapping so items don't disappear on wide screens */
  flex-wrap: wrap;
  justify-content: flex-start;
    }
  .gallery-item.card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 2px 8px rgba(227,122,169,.10);
      overflow: hidden;
      text-decoration: none;
      transition: box-shadow .2s, transform .2s;
      border: 0;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      /* share space evenly — ~3 per row on desktop */
      flex: 1 1 30%;
      max-width: 32%;
      padding-bottom: .5rem;
    }
    .card-content{
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      flex: 1 1 auto; /* make content fill remaining card height */
    }
    .gallery-item.card:hover {
      box-shadow: 0 6px 32px rgba(227,122,169,.18);
      transform: translateY(-2px) scale(1.03);
    }
    .gallery-item.card img {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      display: block;
      border-bottom: 1px solid #f0f0f0;
    }
    .preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999}
  /* ensure preview is above other UI layers */
  .preview-overlay{z-index:10050}
    .preview-content{background:#fff;padding:1rem;border-radius:.5rem;max-width:90%;max-height:90%;display:flex;flex-direction:column;gap:.5rem}
    .preview-content img{max-width:100%;max-height:70vh;object-fit:contain;border-radius:6px}
    .preview-actions{display:flex;gap:.5rem;justify-content:flex-end}
  .gallery-bonita-info{background:rgba(255,255,255,0.98);padding:1.2rem;border-radius:.6rem;margin:0 auto 1rem;max-width:100%;color:var(--brand-dark);font-size:0.975rem;line-height:1.5;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
  .gallery-bonita-info .bonita-lead{font-weight:700;margin:0 0 .35rem;font-size:1.05rem}
  .gallery-bonita-info .bonita-desc{margin:0 0 .5rem}
  .gallery-bonita-info .bonita-list{margin:0;padding-left:1.1rem;display:block}
  .gallery-bonita-info .bonita-list li{list-style:none;margin:0;padding:0;font-weight:500;display:flex;align-items:center;gap:.6rem;margin-bottom:.45rem}
    .gallery-item.card .overlay{
      position:absolute;top:8px;right:8px;display:flex;gap:.4rem;align-items:center;z-index:2
    }
    /* small eye icon in the top-left corner to open preview */
    .gallery-item.card .view-eye{
      position:absolute;top:8px;left:8px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:0;background:rgba(255,255,255,0.95);z-index:10030;cursor:pointer;padding:0;line-height:1;font-size:16px
    }
    .gallery-item.card .view-eye:focus{outline:2px solid var(--brand-primary);outline-offset:2px}
  /* Order selected button styling inside gallery to make it visually prominent */
  .gallery-card .order-selected{ background: var(--brand-primary); color: #fff; border: 1px solid rgba(0,0,0,0.08); padding: .6rem 1rem; border-radius: .5rem; box-shadow: 0 2px 6px rgba(227,122,169,.12); }
  .gallery-card .order-selected:disabled{ background: rgba(200,200,200,0.3); color: rgba(0,0,0,0.6); border: 1px dashed rgba(0,0,0,0.08); box-shadow: none; cursor: not-allowed; }
  .gallery-card .order-selected:not(:disabled):hover{ transform: translateY(-1px); box-shadow: 0 6px 18px rgba(227,122,169,.18); }
    /* ensure select indicator remains clickable when visible */
    .gallery-item.card .overlay .select-indicator{pointer-events:auto}
    .gallery-item.card .overlay .select-indicator{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(0,0,0,0.15);background:rgba(255,255,255,0.95);transition:all .15s}
    .gallery-item.card .overlay .select-indicator.checked{background:var(--brand-primary);border-color:var(--brand-primary);color:#fff;font-weight:700}
    .gallery-item.card{position:relative}
    .gallery-id {
      font-size: 1rem;
      color: var(--brand-primary-dark);
      margin-top: .5rem;
      font-weight: 500;
    }

    /* Ensure the textual area fills remaining space so footers align */
    .gallery-item.card > .card-body, .gallery-item.card > .card-content {
      flex: 1 1 auto;
    }

    @media (max-width: 1100px) {
      /* allow wrapping into two per row on medium screens */
      .gallery-grid { flex-wrap: wrap; }
      .gallery-item.card { flex: 1 1 45%; max-width: 48%; }
    }
    @media (max-width: 700px) {
      /* single column on small screens */
      .gallery-grid { gap: 1rem; flex-wrap: wrap; }
      .gallery-item.card { flex: 1 1 100%; max-width: 100%; }
      .gallery-title { font-size: 2rem; }
      .gallery-item.card img { aspect-ratio: 16 / 9; }
    }
  `]
})
export class GalleryComponent {
  entries = signal<{key:string, path:string}[] | null>(null);
  private svc = inject(GalleryService);
  private sel = inject(SelectionService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  selectionMode = signal(false);
  selected = signal<string[]>(this.sel.current());
  minPack = signal<number>(3);
  // current gallery target from query param (e.g. 'card-pack' or 'bonita-notes-pack')
  target = signal<string | null>(null);
  preview = signal<{ key: string; path: string } | null>(null);
  private _previousActive: HTMLElement | null = null;
  
  // Map numeric gallery keys to product ids used by the order route
  mapPid(k: string){
    if(k === '1') return 'bonita-notes';
    if(k === '2') return 'card-pack';
    if(k === '3') return 'custom';
    return k;
  }

  // Return a translation key for the product title passed to the order page
  mapPtitleKey(k: string){
    if(k === '1') return 'product.bonita.title';
    if(k === '2') return 'product.card.title';
    if(k === '3') return 'shop.custom.title';
    return 'gallery.title';
  }
  
  isMapped(k: string){
    return k === '1' || k === '2' || k === '3';
  }
  private route = inject(ActivatedRoute);
  private routerSvc = inject(Router);

  constructor(){
    console.debug('[Gallery] init, snapshot target=', this.route.snapshot.queryParamMap.get('target'));
    // load the gallery file appropriate for the current target (if any)
  const currentTarget = this.route.snapshot.queryParamMap.get('target') || undefined;
  const incomingSelected = this.route.snapshot.queryParamMap.get('selected');
    this.svc.getGallery(currentTarget).subscribe({
      next: (data: Record<string,string>)=>{
        console.debug('[Gallery] loaded gallery json, keys=', Object.keys(data).length);
        const list = Object.entries(data).map(([k,v])=>{
          // normalize path using <base href> so it works when app is served from subpath
          let path = v;
          if (!path.startsWith('gallery/') && !path.startsWith('/')) path = 'gallery/' + path;
          path = this.resolveWithBase('/' + path.replace(/^\/+/, ''));
          return { key: k, path };
        });
        list.sort((a,b)=> (parseInt(a.key)||999999) - (parseInt(b.key)||999999) || a.key.localeCompare(b.key));
        this.entries.set(list);
        // sync selection from service
        this.selected.set(this.sel.current());
      },
      error: (err)=>{ console.error('[Gallery] failed to load gallery.json', err); this.entries.set([]); this.loadFromProductsFallback(); }
    });
    // React to query param changes (e.g., /gallery?target=card-pack) so selection mode activates reliably
    // activate selection mode if the route already has a target or when it changes
    const initialTarget = this.route.snapshot.queryParamMap.get('target');
    this.target.set(initialTarget);
    // If a selected list is provided in the query params prepopulate the
    // selection from that value instead of clearing persisted selections.
    if (initialTarget === 'card-pack' || initialTarget === 'bonita-notes-pack') {
      this.selectionMode.set(true);
      if (incomingSelected) {
        try{
          const arr = incomingSelected.split(',').filter(x=>x);
          this.sel.set(arr);
          this.selected.set(arr);
        }catch(e){ this.sel.clear(); this.selected.set([]); }
      } else {
        // starting a new picking session should clear any previous selection
        this.sel.clear();
        this.selected.set([]);
      }
      // If bonita, enforce min 5 immediately so UI updates right away
      if (initialTarget === 'bonita-notes-pack') this.minPack.set(5);
    }

    this.route.queryParamMap.subscribe(q => {
      const target = q.get('target');
      const selParam = q.get('selected');
      this.target.set(target);
      if (target === 'card-pack' || target === 'bonita-notes-pack') {
        this.selectionMode.set(true);
        if (selParam) {
          // prepopulate with explicit selection provided by caller
          try{
            const arr = selParam.split(',').filter(x=>x);
            this.sel.set(arr);
            this.selected.set(arr);
          }catch(e){ this.sel.clear(); this.selected.set([]); }
        } else {
          // entering selection mode anew -> clear previous selections
          this.sel.clear();
          this.selected.set([]);
        }
        if (target === 'bonita-notes-pack') this.minPack.set(5);
        // ensure user sees selection affordances
        setTimeout(()=> window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      }
    });

    // Clear selection when user navigates away from gallery without ordering
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart){
        const to = ev.url || '';
        // if we are in selection mode and navigating somewhere other than /order, clear selection
        if (this.selectionMode() && !to.startsWith('/order')){
          this.sel.clear();
          this.selected.set([]);
        }
      }
    });

    // load product metadata so we know the minQty for the current target (used to enable the order button)
    // Note: the route "target" may use a slightly different name than the product id in products.json
    // (e.g., 'bonita-notes-pack' vs 'bonita-notes'), so map known targets to product ids explicitly
    this.svc.getProducts().subscribe(list=>{
      let t = this.route.snapshot.queryParamMap.get('target') || '';
      // Normalize known target aliases to product ids
      if (t === 'bonita-notes-pack') t = 'bonita-notes';
      if (t === 'cards') t = 'card-pack';
      // Prefer product record for the current (normalized) target
      const p = list.find(x=> x.id === t) || null;
      if (p && p.minQty) {
        this.minPack.set(p.minQty);
      }
    }, err => console.warn('[Gallery] failed to load products.json', err));
  }

  private resolveWithBase(path: string){
    try{
      const base = document.querySelector('base')?.getAttribute('href') || '/';
      if (base === '/') return path;
      // ensure leading slash semantics
      const normalizedBase = base.endsWith('/') ? base.slice(0,-1) : base;
      return normalizedBase + path;
    }catch(e){
      return path;
    }
  }

  private loadFromProductsFallback(){
    // If gallery.json is missing, provide a reasonable fallback using product images
    this.svc.getProducts().subscribe(list=>{
      const entries: {key:string,path:string}[] = [];
      let idx = 1000;
      for(const p of list){
        if (!p.images) continue;
        for(const img of p.images){
          let path = img;
          if (!path.startsWith('/')){
            if (!path.startsWith('gallery/')) path = 'gallery/' + path;
            path = '/' + path;
          }
          entries.push({ key: `${p.id}-${idx++}`, path });
        }
      }
      if (entries.length) {
        console.debug('[Gallery] fallback produced', entries.length, 'entries from products.json');
        this.entries.set(entries);
      }
    }, err => console.warn('[Gallery] fallback products load failed', err));
  }

  isSelected(k: string){ return (this.selected() || []).includes(k); }
  selectedCount(){ return (this.selected() || []).length; }
  onViewClick(k: string, ev: Event){
    // ensure the view button opens preview and does not toggle selection
    ev?.stopPropagation();
    ev?.preventDefault();
    const found = (this.entries() || []).find(x => x.key === k);
    if (found) this.showPreview(found);
  }
  onCardClick(k: string, ev: Event){
    // prevent any native navigation
    ev?.stopPropagation();
    ev?.preventDefault();

    console.debug('[Gallery] onCardClick', { key: k, selectionMode: this.selectionMode() });

    if (this.selectionMode()){
      // toggle selection via service and keep the local signal in sync
      this.sel.toggle(k);
      this.selected.set(this.sel.current());
      return;
    }

    // not in selection mode -> open preview modal for this key
    const found = (this.entries() || []).find(x => x.key === k);
    if (found) this.showPreview(found);
    else console.warn('[Gallery] clicked item not found in entries', k);
  }

  private openPreviewForKey(k: string){
    const found = (this.entries() || []).find(x => x.key === k);
    if (found) this.showPreview(found);
  }

  // When the preview overlay receives keyboard events
  onPreviewKey(ev: KeyboardEvent){
    const k = ev?.key || ev?.code;
    if (k === 'Escape' || k === 'Esc'){
      ev.preventDefault();
      this.closePreview();
    }
  }

  private showPreview(found: { key: string; path: string }){
    // remember previously focused element so we can restore focus later
    try{ this._previousActive = document.activeElement as HTMLElement | null; }catch(e){ this._previousActive = null; }
    console.debug('[Gallery] showPreview ->', found.key, found.path);
    this.preview.set({ key: found.key, path: found.path });
    // move focus into the modal (prefer close button), allow DOM to update
    setTimeout(()=>{
      const btn = document.querySelector('.preview-content .preview-close') as HTMLElement | null;
      if (btn) btn.focus(); else (document.querySelector('.preview-overlay') as HTMLElement | null)?.focus();
    }, 0);
  }

  closePreview(){
    console.debug('[Gallery] closePreview');
    this.preview.set(null);
    // restore focus to previously-focused element
    setTimeout(()=>{
      try{ if (this._previousActive && typeof (this._previousActive as any).focus === 'function') (this._previousActive as HTMLElement).focus(); }catch(e){}
      this._previousActive = null;
    }, 0);
  }

  // Select (toggle) the currently previewed card and close the preview.
  selectFromPreview(){
    const p = this.preview();
    if (!p) return;
    // Toggle selection for the previewed card and show selection UI.
    this.sel.toggle(p.key);
    this.selected.set(this.sel.current());
    // Ensure selection mode is active and enforce target-specific minima (e.g., Bonita requires 5)
    this.selectionMode.set(true);
    const t = this.target();
    if (t === 'bonita-notes-pack') this.minPack.set(5);
    else this.minPack.set(3);
    this.preview.set(null);
  }

  orderSelected(){
    const ids = this.sel.current();
    // enforce min selection defensively (in case minPack wasn't applied elsewhere)
    if (!ids || ids.length < (this.minPack() || 1)){
      alert(this.translate.instant('gallery.selectCards') + ' — ' + this.translate.instant('gallery.selected')?.replace('{{n}}', String(ids.length)));
      return;
    }
    // persist selection explicitly and navigate to Order with selected IDs
    this.sel.set(ids);
    // also include in query params for convenience
    // Choose pid based on the active gallery target so Bonita orders go to bonita-notes
    const target = this.target();
    const pid = target === 'bonita-notes-pack' ? 'bonita-notes' : 'card-pack';
    this.router.navigate(['/order'], { queryParams: { pid, selected: ids.join(',') } });
  }

  toggleSelectionMode(){
    const turningOn = !this.selectionMode();
    if (turningOn){
      // starting a fresh selection session should clear previous selections
      this.sel.clear();
      this.selected.set([]);
      // When entering selection mode manually, ensure minPack reflects current gallery target
      const t = this.target();
      if (t === 'bonita-notes-pack') this.minPack.set(5);
      else this.minPack.set(3);
    }
    this.selectionMode.set(turningOn);
  }
}
