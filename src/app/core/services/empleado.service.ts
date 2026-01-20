import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, BehaviorSubject } from 'rxjs';
import { Empleado } from '../models/empleado.model';
import { GoogleSheetsAdapter } from '../adapters/google-sheets.adapter';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private http = inject(HttpClient);
  private adapter = inject(GoogleSheetsAdapter);
  private apiUrl = environment.apiUrl;

  private empleadosState = new BehaviorSubject<Empleado[]>([]);
  public empleadosSignal = signal<Empleado[]>([]);
  
  private loaded = false;

  constructor() {
    this.empleadosState.subscribe(e => this.empleadosSignal.set(e));
  }

  getEmpleados(): Observable<Empleado[]> {
    if (!this.loaded) {
      this.refreshEmpleados().subscribe();
    }
    return this.empleadosState.asObservable();
  }

  private refreshEmpleados(): Observable<Empleado[]> {
    return this.http.get<any>(`${this.apiUrl}?type=empleados`).pipe(
      map(response => {
        if (response.status === 'error') throw new Error(response.message);
        const empleados = this.adapter.adaptEmpleados(response);
        this.empleadosState.next(empleados.filter(e => e.activo));
        this.loaded = true;
        return empleados;
      })
    );
  }
}
