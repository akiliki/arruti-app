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
        loadComponent: () => import('./features/pedidos/tienda-pedidos-list.component').then(m => m.TiendaPedidosListComponent)
      },
      {
        path: 'obrador',
        loadComponent: () => import('./features/pedidos/obrador-pedidos-list.component').then(m => m.ObradorPedidosListComponent)
      },
      {
        path: 'nuevo-pedido',
        loadComponent: () => import('./features/pedidos/tienda-pedido-form.component').then(m => m.TiendaPedidoFormComponent)
      },
      {
        path: 'pedidos/editar/:id',
        loadComponent: () => import('./features/pedidos/tienda-pedido-form.component').then(m => m.TiendaPedidoFormComponent)
      },
      {
        path: 'pedidos/:id/estado',
        loadComponent: () => import('./features/pedidos/tienda-update-status.component').then(m => m.TiendaUpdateStatusComponent)
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
        path: 'productos/:id/receta/nueva',
        loadComponent: () => import('./features/productos/receta-form.component').then(m => m.RecetaFormComponent)
      },
      {
        path: 'productos/:id/receta/:idReceta',
        loadComponent: () => import('./features/productos/receta-form.component').then(m => m.RecetaFormComponent)
      },
      {
        path: 'productos/:id',
        loadComponent: () => import('./features/productos/producto-detail.component').then(m => m.ProductoDetailComponent)
      },
      {
        path: 'recetas',
        loadComponent: () => import('./features/productos/all-recetas-list.component').then(m => m.AllRecetasListComponent)
      },
      {
        path: 'recetas/:id',
        loadComponent: () => import('./features/productos/receta-detail.component').then(m => m.RecetaDetailComponent)
      },
      {
        path: 'pedidos/:id',
        loadComponent: () => import('./features/pedidos/tienda-pedido-detail.component').then(m => m.TiendaPedidoDetailComponent)
      },
      {
        path: 'obrador/pedidos/:id',
        loadComponent: () => import('./features/pedidos/obrador-pedido-detail.component').then(m => m.ObradorPedidoDetailComponent)
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
