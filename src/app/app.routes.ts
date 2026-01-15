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
  }
];
