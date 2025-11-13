import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { OrdersService, TrackedOrder } from '../order/orders.service';

@Component({
	selector: 'td-track',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslateModule],
	template: `
	<h1>{{ 'track.title' | translate }}</h1>
	<form (ngSubmit)="lookup()" class="form">
		<input [(ngModel)]="code" name="code" [placeholder]="('track.placeholder' | translate)" />
		<button class="btn">{{ 'track.button' | translate }}</button>
	</form>

	<div *ngIf="order() as o" class="card">
		<div class="row">
			<img *ngIf="o.productImage" [src]="o.productImage" [alt]="('track.coverAlt' | translate)" />
			<div>
				<div class="bold">{{ o.productTitle }}</div>
				<div class="muted small">{{ o.code }} • {{ o.createdUtc | date:'dd/MM/yyyy' }}</div>
				<div class="mt-2">
					<div class="fw-semibold">{{ 'track.customer' | translate }}</div>
					<div class="small muted">{{ (o.firstName || '') + ' ' + (o.lastName || '') }} <span *ngIf="o.email">• {{ o.email }}</span> <span *ngIf="o.phone">• {{ o.phone }}</span></div>
					<div *ngIf="o.address" class="mt-1 small">{{ 'order.address' | translate }}: {{ o.address }}</div>
				</div>
			</div>
		</div>
		<div class="mt">
			<div class="bold">{{ 'track.status' | translate }}: {{ o.status }}</div>
			<div class="muted" *ngIf="o.estimatedDeliveryStartUtc || o.estimatedDeliveryUtc">
				<ng-container *ngIf="o.estimatedDeliveryStartUtc && o.estimatedDeliveryEndUtc; else single">
					{{ 'track.estimatedBetween' | translate }} {{ o.estimatedDeliveryStartUtc | date:'dd/MM/yyyy' }}
					{{ 'track.estimatedAnd' | translate }} {{ o.estimatedDeliveryEndUtc | date:'dd/MM/yyyy' }}
				</ng-container>
				<ng-template #single>
					{{ 'track.estimatedOn' | translate }} {{ (o.estimatedDeliveryUtc || o.estimatedDeliveryStartUtc) | date:'dd/MM/yyyy' }}
				</ng-template>
			</div>
			<div class="logs" *ngIf="o.logs?.length">
				<div class="bold">{{ 'track.logs' | translate }}</div>
				<div class="log" *ngFor="let l of o.logs">
					<div class="muted small">{{ l.timestampUtc | date:'dd/MM/yyyy HH:mm' }}</div>
					<div>{{ l.event }} <span *ngIf="l.newStatus !== undefined" class="badge">{{ l.newStatus }}</span> <span *ngIf="l.note">— {{ l.note }}</span></div>
				</div>
			</div>
		</div>
	</div>
	`,
	styles: [`
		.form{display:flex;gap:.5rem;max-width:520px}
		.card{max-width:720px;border:1px solid #eee;padding:1rem;border-radius:8px;margin-top:1rem}
		.row{display:flex;gap:.75rem;align-items:center}
		img{width:72px;height:72px;object-fit:cover;border-radius:6px}
		.bold{font-weight:600}
		.muted{color:#666}
		.small{font-size:.875rem}
		.badge{background:#eee;border-radius:999px;padding:.1rem .5rem}
		.logs{margin-top:1rem}
		.log{padding:.25rem 0;border-bottom:1px dashed #eee}
	`]
})
export class TrackPage {
	code = '';
	order = signal<TrackedOrder | null>(null);
	private orders = inject(OrdersService);

	async lookup(){
		const code = this.code.trim();
		if(!code) { this.order.set(null); return; }
		this.orders.get(code).subscribe({
			next: (o)=> this.order.set(o),
			error: ()=> this.order.set(null)
		});
	}
}
