import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'td-home',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
  <h1>{{ 'home.title' | translate }}</h1>
  <div class="hero d-flex align-items-center">
    <div style="width:160px;margin-right:2rem;">
  <img src="/gallery/tamara.jpg" [alt]="('home.imageAlt' | translate)" style="width:160px;height:160px;object-fit:cover;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.08)" />
    </div>
    <div style="flex:1">
      <p style="font-size:1.15rem;line-height:1.6;color:var(--brand-dark)">{{ 'home.subtitle' | translate }}</p>
      <div class="mt-3">
        <a routerLink="/shop" class="btn btn-primary me-2">{{ 'home.cta.shop' | translate }}</a>
        <a [routerLink]="['/order']" [queryParams]="{ pid: 'custom', ptitle: ( 'home.cta.order' | translate ) }" class="btn btn-outline-primary">{{ 'home.cta.order' | translate }}</a>
      </div>
    </div>
  </div>
  `
})
export class HomeComponent {}
