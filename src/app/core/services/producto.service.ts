import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { Producto } from '../models/producto.model';
import { GoogleSheetsAdapter } from '../adapters/google-sheets.adapter';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private http = inject(HttpClient);
  private adapter = inject(GoogleSheetsAdapter);
  private apiUrl = environment.apiUrl;

  getProductos(): Observable<Producto[]> {
    // Usamos un parámetro para indicar que queremos productos
    return this.http.get<any>(`${this.apiUrl}?type=productos`).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message || 'Error al cargar los productos.');
        }
        return this.adapter.adaptProductos(response);
      }),
      catchError(error => {
        console.error('Error fetching productos:', error);
        return throwError(() => new Error('No se pudieron cargar los productos.'));
      })
    );
  }

  addProducto(producto: Omit<Producto, 'id'>): Observable<any> {
    const newProducto: Producto = {
      ...producto,
      id: crypto.randomUUID()
    };
    
    const payload = {
      ...this.adapter.prepareProductoForPost(newProducto),
      action: 'addProduct'
    };

    // Usamos text/plain para evitar problemas de CORS preflight con Google Apps Script
    const headers = new HttpHeaders({
      'Content-Type': 'text/plain;charset=utf-8'
    });

    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), { headers }).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message || 'Error al añadir el producto.');
        }
        return response;
      }),
      catchError(error => {
        console.error('Error adding producto:', error);
        return throwError(() => new Error('No se pudo añadir el producto.'));
      })
    );
  }
}
