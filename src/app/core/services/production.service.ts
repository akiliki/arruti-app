import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProduccionStats } from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class ProductionService {

  constructor() { }

  getDashboardStats(): Observable<ProduccionStats> {
    // Datos de ejemplo para desarrollo inicial
    return of({
      totalPendientes: 12,
      enHorno: 3,
      finalizadosHoy: 25
    });
  }
}
