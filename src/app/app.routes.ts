import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pedidos',
    pathMatch: 'full'
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./features/pedidos/pedidos-list.component').then(m => m.PedidosListComponent)
  },
  {
    path: 'obrador',
    loadComponent: () => import('./features/pedidos/pedidos-obrador.component').then(m => m.PedidosObradorComponent)
  },
  {
    path: 'nuevo-pedido',
    loadComponent: () => import('./features/pedidos/add-pedido.component').then(m => m.AddPedidoComponent)
  },
  {
    path: 'pedidos/:id/estado',
    loadComponent: () => import('./features/pedidos/update-status.component').then(m => m.UpdateStatusComponent)
  },
  {
    path: 'productos',
    loadComponent: () => import('./features/productos/productos-list.component').then(m => m.ProductosListComponent)
  },
  {
    path: 'nuevo-producto',
    loadComponent: () => import('./features/productos/add-producto.component').then(m => m.AddProductoComponent)
  },
  {
    path: 'productos/:id',
    loadComponent: () => import('./features/productos/producto-detail.component').then(m => m.ProductoDetailComponent)
  },
  {
    path: 'pedidos/:id',
    loadComponent: () => import('./features/pedidos/pedido-tienda-detail.component').then(m => m.PedidoTiendaDetailComponent)
  },
  {
    path: 'obrador/pedidos/:id',
    loadComponent: () => import('./features/pedidos/pedido-obrador-detail.component').then(m => m.PedidoObradorDetailComponent)
  }
];
