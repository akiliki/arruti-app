import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./features/pedidos/pedidos-list.component').then(m => m.PedidosListComponent)
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
  }
];
