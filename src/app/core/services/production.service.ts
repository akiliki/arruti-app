import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
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

  getDashboardStats(): Observable<ProduccionStats> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message || 'Error desconocido en el servidor de datos.');
        }
        return this.adapter.adaptStats(response);
      }),
      catchError(error => {
        console.error('Error fetching production stats:', error);
        const message = error instanceof Error ? error.message : 'No se pudo cargar la información de producción. Por favor, compruebe la configuración del script.';
        return throwError(() => new Error(message));
      })
    );
  }

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message || 'Error al cargar los pedidos.');
        }
        return this.adapter.adaptPedidos(response);
      }),
      catchError(error => {
        console.error('Error fetching pedidos:', error);
        return throwError(() => new Error('No se pudieron cargar los pedidos.'));
      })
    );
  }

  addPedido(pedido: Partial<Pedido>): Observable<any> {
    const payload = {
      ...this.adapter.prepareForPost(pedido),
      action: 'add'
    };
    
    // Usamos text/plain para evitar problemas de CORS preflight con Google Apps Script
    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), { headers }).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message || 'Error al guardar el pedido.');
        }
        return response;
      }),
      catchError(error => {
        console.error('Error adding pedido:', error);
        const message = error instanceof Error ? error.message : 'No se pudo guardar el pedido. Por favor, inténtelo de nuevo.';
        return throwError(() => new Error(message));
      })
    );
  }

  updatePedidoStatus(id: string, estado: EstadoPedido): Observable<any> {
    const payload = {
      action: 'updateStatus',
      id,
      estado
    };

    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), { headers }).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message || 'Error al actualizar el estado.');
        }
        return response;
      }),
      catchError(error => {
        console.error('Error updating status:', error);
        return throwError(() => new Error('No se pudo actualizar el estado del pedido.'));
      })
    );
  }
}
