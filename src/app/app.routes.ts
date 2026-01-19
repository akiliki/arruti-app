import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
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
        loadComponent: () => import('./features/pedidos/pedido-form.component').then(m => m.PedidoFormComponent)
      },
      {
        path: 'pedidos/editar/:id',
        loadComponent: () => import('./features/pedidos/pedido-form.component').then(m => m.PedidoFormComponent)
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
        loadComponent: () => import('./features/productos/producto-form.component').then(m => m.ProductoFormComponent)
      },
      {
        path: 'productos/editar/:id',
        loadComponent: () => import('./features/productos/producto-form.component').then(m => m.ProductoFormComponent)
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
      },
      {
        path: 'seguridad',
        loadComponent: () => import('./features/seguridad/seguridad.component').then(m => m.SeguridadComponent),
        children: [
          {
            path: '',
            redirectTo: 'usuarios',
            pathMatch: 'full'
          },
          {
            path: 'usuarios',
            loadComponent: () => import('./features/seguridad/usuarios-list.component').then(m => m.UsuariosListComponent)
          },
          {
            path: 'perfiles',
            loadComponent: () => import('./features/seguridad/perfiles-list.component').then(m => m.PerfilesListComponent)
          }
        ]
      }
    ]
  }
];
