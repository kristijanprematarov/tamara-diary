import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  { path: 'shop', loadComponent: () => import('./features/shop/product-list.component').then(m => m.ShopComponent) },
  { path: 'shop/:id', loadComponent: () => import('./features/shop/product-detail.component').then(m => m.ProductComponent) },
  { path: 'order', loadComponent: () => import('./features/order/order.component').then(m => m.OrderComponent) },
  { path: 'track', loadComponent: () => import('./features/track/track.component').then(m => m.TrackComponent) },
  { path: 'gallery', loadComponent: () => import('./features/gallery/gallery.component').then(m => m.GalleryComponent) },
  { path: 'admin-gateway', loadComponent: () => import('./features/admin-gateway/admin-gateway.component').then(m => m.AdminGatewayComponent) },
  { path: 'admin', loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },
  { path: '**', redirectTo: '' }
];
