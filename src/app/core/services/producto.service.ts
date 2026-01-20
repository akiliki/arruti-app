import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, tap, of, BehaviorSubject } from 'rxjs';
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

  // Estado maestro reactivo
  private productosState = new BehaviorSubject<Producto[]>([]);
  public productosSignal = signal<Producto[]>([]);
  
  private loaded = false;

  constructor() {
    this.productosState.subscribe(p => this.productosSignal.set(p));
  }

  // Selector para obtener familias únicas
  public familiasSignal = computed(() => {
    const familias = this.productosSignal().map(p => p.familia);
    return [...new Set(familias)].sort();
  });

  getProductos(): Observable<Producto[]> {
    if (!this.loaded) {
      this.refreshProductos().subscribe();
    }
    return this.productosState.asObservable();
  }

  private refreshProductos(): Observable<Producto[]> {
    // Usamos una petición limpia para evitar problemas de CORS con Google Script
    return this.http.get<any>(`${this.apiUrl}?type=productos`).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        const productos = this.adapter.adaptProductos(response);
        this.productosState.next(productos);
        this.loaded = true;
        return productos;
      }),
      catchError(error => {
        console.error('Error fetching productos:', error);
        return throwError(() => new Error('No se pudieron cargar los productos.'));
      })
    );
  }

  getProductoById(id: string): Observable<Producto | undefined> {
    return this.getProductos().pipe(
      map(productos => productos.find(p => p.id === id))
    );
  }

  addProducto(producto: Omit<Producto, 'id'>): Observable<any> {
    const id = crypto.randomUUID();
    const newProducto: Producto = { ...producto, id };
    
    // 1. ACTUALIZACIÓN OPTIMISTA
    const previousState = this.productosState.value;
    this.productosState.next([...previousState, newProducto]);
    
    const payload = {
      ...this.adapter.prepareProductoForPost(newProducto),
      action: 'addProduct'
    };

    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' })
    }).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        return response;
      }),
      catchError(error => {
        // 2. ROLLBACK
        this.productosState.next(previousState);
        return throwError(() => new Error('Error al añadir. Se ha revertido el cambio.'));
      })
    );
  }

  updateProducto(producto: Producto): Observable<any> {
    // 1. ACTUALIZACIÓN OPTIMISTA
    const previousState = this.productosState.value;
    const updatedState = previousState.map(p => p.id === producto.id ? producto : p);
    this.productosState.next(updatedState);

    const payload = {
      ...this.adapter.prepareProductoForPost(producto),
      action: 'updateProduct'
    };

    return this.http.post<any>(this.apiUrl, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' })
    }).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        return response;
      }),
      catchError(error => {
        // 2. ROLLBACK
        this.productosState.next(previousState);
        return throwError(() => new Error('Error al actualizar. Se ha revertido el cambio.'));
      })
    );
  }
}
