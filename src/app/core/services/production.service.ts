import { Injectable, inject, signal, computed, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, tap, of, BehaviorSubject } from 'rxjs';
import { Pedido, ProduccionStats, EstadoPedido } from '../models/pedido.model';
import { GoogleSheetsAdapter } from '../adapters/google-sheets.adapter';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductionService {
  private http = inject(HttpClient);
  private adapter = inject(GoogleSheetsAdapter);
  private apiUrl = environment.apiUrl;

  // Estado maestro
  private pedidosState = new BehaviorSubject<Pedido[]>([]);
  private statsState = new BehaviorSubject<ProduccionStats>({
    totalPendientes: 0,
    enHorno: 0,
    producidosHoy: 0,
    entregadosHoy: 0
  });

  // Exponer como Signals para la UI moderna
  public pedidosSignal = signal<Pedido[]>([]);
  public statsSignal = signal<ProduccionStats>({
    totalPendientes: 0,
    enHorno: 0,
    producidosHoy: 0,
    entregadosHoy: 0
  });

  private pedidosLoaded = false;
  private statsLoaded = false;

  constructor() {
    // Sincronizar Subjects con Signals
    this.pedidosState.subscribe(p => this.pedidosSignal.set(p));
    this.statsState.subscribe(s => this.statsSignal.set(s));
  }

  getDashboardStats(): Observable<ProduccionStats> {
    const refresh$ = this.refreshStats();
    return this.statsLoaded ? this.statsState.asObservable() : refresh$;
  }

  private refreshStats(): Observable<ProduccionStats> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        const stats = this.adapter.adaptStats(response);
        this.statsState.next(stats);
        this.statsLoaded = true;
        return stats;
      }),
      catchError(error => {
        console.error('Error fetching production stats:', error);
        return throwError(() => new Error('No se pudo cargar la información de producción.'));
      })
    );
  }

  getPedidos(): Observable<Pedido[]> {
    const refresh$ = this.refreshPedidos();
    return this.pedidosLoaded ? this.pedidosState.asObservable() : refresh$;
  }

  refreshPedidos(): Observable<Pedido[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        const pedidos = this.adapter.adaptPedidos(response);
        this.pedidosState.next(pedidos);
        this.pedidosLoaded = true;
        return pedidos;
      }),
      catchError(error => {
        console.error('Error fetching pedidos:', error);
        return throwError(() => new Error('No se pudieron cargar los pedidos.'));
      })
    );
  }

  addPedido(pedido: Partial<Pedido>): Observable<any> {
    const id = pedido.id || crypto.randomUUID();
    
    // Normalizar fecha para el estado local (Signal/BehaviorSubject)
    let fechaEntrega = pedido.fechaEntrega || new Date();
    if (typeof fechaEntrega === 'string') {
      fechaEntrega = new Date(fechaEntrega);
    }

    const newPedido: Pedido = {
      id,
      producto: pedido.producto || '',
      cantidad: pedido.cantidad || 0,
      fechaEntrega,
      estado: pedido.estado || 'Pendiente',
      nombreCliente: pedido.nombreCliente || '',
      notasPastelero: pedido.notasPastelero || '',
      notasTienda: pedido.notasTienda || ''
    } as Pedido;
    
    // 1. ACTUALIZACIÓN OPTIMISTA
    const previousPedidos = this.pedidosState.value;
    this.pedidosState.next([newPedido, ...previousPedidos]);
    
    const payload = {
      ...this.adapter.prepareForPost(newPedido),
      action: 'add'
    };
    
    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' })
    }).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message || 'Error en el servidor');
        return response;
      }),
      tap(() => {
        this.statsLoaded = false;
      }),
      catchError(error => {
        // 2. ROLLBACK
        this.pedidosState.next(previousPedidos);
        return throwError(() => new Error(error.message || 'Error al guardar. Se ha revertido el cambio.'));
      })
    );
  }

  updatePedidoStatus(id: string, estado: EstadoPedido): Observable<any> {
    // 1. ACTUALIZACIÓN OPTIMISTA
    const previousPedidos = this.pedidosState.value;
    this.pedidosState.next(
      previousPedidos.map(p => p.id === id ? { ...p, estado } : p)
    );

    const payload = { action: 'updateStatus', id, estado };

    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' })
    }).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message || 'Error en el servidor');
        return response;
      }),
      tap(() => {
        this.statsLoaded = false;
      }),
      catchError(error => {
        // 2. ROLLBACK
        this.pedidosState.next(previousPedidos);
        return throwError(() => new Error(error.message || 'Error al actualizar. Se ha revertido el cambio.'));
      })
    );
  }
}
