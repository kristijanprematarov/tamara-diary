import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { GalleryService, Product } from './gallery.service';
import { Router } from '@angular/router';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'td-shop',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
  <h1>{{ 'shop.title' | translate }}</h1>
  <div *ngIf="!products()" class="text-muted">{{ 'common.loading' | translate }}</div>
  <div class="grid">
    <!-- Custom quick-entry card included in the same grid -->
    <div class="card">
      <div class="cover" style="background:#f7f5f9;display:flex;align-items:center;justify-content:center;height:180px">
        <span style="font-weight:600">{{ 'shop.custom.title' | translate }}</span>
      </div>
      <div class="body">
        <p class="muted">{{ 'shop.custom.caption' | translate }}</p>
        <a [routerLink]="['/order']" [queryParams]="{ pid: 'custom', ptitle: ( 'home.cta.order' | translate ) }" class="btn">{{ 'home.cta.order' | translate }}</a>
      </div>
    </div>

    <!-- Product cards in the same grid -->
    <ng-container *ngIf="products() as list">
      <div class="card" *ngFor="let p of list">
        <div class="cover">
          <img [src]="p.images[0]" [alt]="(p.title | translate)">
          <span class="badge">{{ format(p.priceEur) }}</span>
        </div>
        <div class="body">
          <h3>{{ p.title | translate }}</h3>
          <p class="muted">{{ p.caption | translate }}</p>
          <ng-container *ngIf="p.id === 'card-pack' || p.id === 'bonita-notes'; else regularView">
            <!-- Directly open gallery in selection mode for card pack and Bonita pack -->
            <button type="button" class="btn" (click)="openPack(p.id)">{{ 'shop.view' | translate }}</button>
          </ng-container>
          <ng-template #regularView>
            <a [routerLink]="['/shop', p.id]" class="btn">{{ 'shop.view' | translate }}</a>
          </ng-template>
        </div>
      </div>
    </ng-container>
  </div>
  `,
  styles: [`
    .grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
    .card{border:1px solid #eee;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .cover{position:relative}
    img{display:block;width:100%;height:180px;object-fit:cover}
    .badge{position:absolute;right:.5rem;bottom:.5rem;background:#111;color:#fff;padding:.25rem .5rem;border-radius:999px;font-size:.8rem}
    .body{padding:.75rem}
    .muted{color:#777}
    .btn{display:inline-block;padding:.4rem .8rem;border:1px solid #333;border-radius:999px;text-decoration:none}
  `]
})
export class ShopComponent {
  private svc = inject(GalleryService);
  private currency = inject(CurrencyService);
  products = signal<Product[] | null>(null);
  private router = inject(Router);

  constructor(){
    this.svc.getProducts().subscribe({
      next: (d)=> {
        // Show Bonita and the CARD pack (custom portrait is a separate quick-start card above)
        const only = (d || []).filter(p => String(p.id || '') === 'bonita-notes' || String(p.id || '') === 'card-pack');
        this.products.set(only);
      },
      error: ()=> this.products.set([])
    });
  }
  format(eur: number){ return this.currency.format(eur); }

  openPack(pid: string){
    const target = pid === 'bonita-notes' ? 'bonita-notes-pack' : (pid === 'card-pack' ? 'card-pack' : undefined);
    this.router.navigate(['/gallery'], { queryParams: { target } });
  }
}
