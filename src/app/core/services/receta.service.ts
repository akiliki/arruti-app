import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, tap, BehaviorSubject, of } from 'rxjs';
import { Receta } from '../models/receta.model';
import { GoogleSheetsAdapter } from '../adapters/google-sheets.adapter';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecetaService {
  private http = inject(HttpClient);
  private adapter = inject(GoogleSheetsAdapter);
  private apiUrl = environment.apiUrl;

  private recetasState = new BehaviorSubject<Receta[]>([]);
  public recetasSignal = signal<Receta[]>([]);
  private loaded = false;

  constructor() {
    this.recetasState.subscribe(r => this.recetasSignal.set(r));
  }

  getRecetas(): Observable<Receta[]> {
    if (!this.loaded) {
      return this.refreshRecetas();
    }
    return this.recetasState.asObservable();
  }

  refreshRecetas(): Observable<Receta[]> {
    return this.http.get<any>(`${this.apiUrl}?type=recetas`).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        const recetas = this.adapter.adaptRecetas(response);
        this.recetasState.next(recetas);
        this.loaded = true;
        return recetas;
      }),
      catchError(error => {
        console.error('Error fetching recetas:', error);
        return of([]);
      })
    );
  }

  getRecetasByProducto(idProducto: string): Observable<Receta[]> {
    return this.getRecetas().pipe(
      map(recetas => recetas.filter(r => r.idProducto === idProducto))
    );
  }

  saveReceta(receta: Receta): Observable<any> {
    const payload = {
      ...this.adapter.prepareRecetaForPost(receta),
      action: 'addReceta'
    };

    return this.http.post(this.apiUrl, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' })
    }).pipe(
      tap(() => {
        const current = this.recetasState.value;
        this.recetasState.next([...current, receta]);
      })
    );
  }

  updateReceta(receta: Receta): Observable<any> {
    const payload = {
      ...this.adapter.prepareRecetaForPost(receta),
      action: 'updateReceta'
    };

    return this.http.post(this.apiUrl, JSON.stringify(payload), {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' })
    }).pipe(
      tap(() => {
        const current = this.recetasState.value;
        const index = current.findIndex(r => r.id === receta.id);
        if (index !== -1) {
          current[index] = receta;
          this.recetasState.next([...current]);
        }
      })
    );
  }
}
