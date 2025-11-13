import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { LoadingService } from './loading.service';

@Component({
  selector: 'td-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="loading | async" class="td-loader-overlay">
      <div class="td-loader-card">
        <div class="td-spinner"></div>
        <div class="td-loader-text">Processing order…</div>
      </div>
    </div>
  `,
  styles: [
    `
    .td-loader-overlay{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(255,230,240,0.55);display:flex;align-items:center;justify-content:center;z-index:99999}
    .td-loader-card{background:rgba(255,255,255,0.95);padding:1.25rem 1.5rem;border-radius:12px;display:flex;align-items:center;gap:1rem;box-shadow:0 8px 28px rgba(0,0,0,0.08)}
    .td-spinner{width:46px;height:46px;border-radius:50%;border:6px solid rgba(227,122,169,0.2);border-top-color:var(--brand-primary,#e37aa9);animation:td-spin .9s linear infinite}
    .td-loader-text{font-weight:700;color:var(--brand-primary-dark,#d66596)}
    @keyframes td-spin{to{transform:rotate(360deg)}}
    `
  ]
})
export class LoadingComponent{
  loading!: Observable<boolean>;
  constructor(private loader: LoadingService){
    this.loading = this.loader.loading$;
  }
}
