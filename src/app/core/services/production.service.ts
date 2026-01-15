import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { ProduccionStats } from '../models/pedido.model';
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
}
