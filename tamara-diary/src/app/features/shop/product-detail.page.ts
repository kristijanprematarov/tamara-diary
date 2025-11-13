import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GalleryService, Product } from './gallery.service';
import { CurrencyService } from '../../services/currency.service';

@Component({
	selector: 'td-product',
	standalone: true,
	imports: [CommonModule, RouterLink, TranslateModule],
	template: `
	<a routerLink="/shop">← {{ 'product.back' | translate }}</a>
	<div *ngIf="!product()">{{ 'common.loading' | translate }}</div>
	<div *ngIf="product() as p" class="product">
		<div class="images">
			<img *ngFor="let img of p.images; let i = index" [src]="img" [alt]="p.title + ' ' + (i+1)" />
		</div>
		<div class="info">
			<h2>{{ p.title }}</h2>
			<div class="price">{{ format(p.priceEur) }}</div>
			<div *ngIf="p.minQty" class="form-text" style="margin-top:.5rem">{{ 'product.minOrder' | translate }} {{ p.minQty }}</div>
			<p class="muted">{{ p.caption | translate }}</p>
			<a [routerLink]="['/order']" [queryParams]="{ pid: p.id, ptitle: p.title }" class="btn btn-primary">{{ 'product.orderThis' | translate }}</a>
		</div>
	</div>
	`,
	styles: [`
		.product{display:grid;gap:1rem;grid-template-columns:2fr 1fr}
		.images{display:grid;gap:.5rem}
		img{width:100%;display:block;border-radius:8px;object-fit:cover}
		.price{font-size:1.8rem;font-weight:700}
		.muted{color:#666}
		@media (max-width: 800px){.product{grid-template-columns:1fr}}
	`]
})
export class ProductPage {
	private route = inject(ActivatedRoute);
		private svc = inject(GalleryService);
		private currency = inject(CurrencyService);
	product = signal<Product | null>(null);

	constructor(){
		const id = this.route.snapshot.paramMap.get('id');
		this.svc.getProducts().subscribe(list=>{
			this.product.set(list.find(p=>p.id===id) ?? null);
		});
	}
		format(eur: number){ return this.currency.format(eur); }
	}
