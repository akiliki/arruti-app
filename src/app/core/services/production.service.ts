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
      map(response => this.adapter.adaptStats(response)),
      catchError(error => {
        console.error('Error fetching production stats:', error);
        return throwError(() => new Error('No se pudo cargar la información de producción. Por favor, inténtelo de nuevo más tarde.'));
      })
    );
  }
}
