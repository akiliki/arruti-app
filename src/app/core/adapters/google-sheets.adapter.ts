import { Injectable } from '@angular/core';
import { Pedido, ProduccionStats, EstadoPedido } from '../models/pedido.model';

interface ApiResponse {
  status: string;
  data: Array<{
    id: string;
    producto: string;
    cantidad: number;
    fecha: string;
    estado_actual: string;
  }>;
  stats: {
    pendientes: number;
    horno: number;
    finalizados: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsAdapter {
  
  /**
   * Transforma pedidos de la API al modelo de dominio
   */
  adaptPedidos(response: ApiResponse): Pedido[] {
    return response.data.map(item => ({
      id: item.id,
      producto: item.producto,
      cantidad: item.cantidad,
      fechaEntrega: new Date(item.fecha),
      estado: this.mapEstado(item.estado_actual)
    }));
  }

  /**
   * Transforma las estadísticas de la API al modelo de dominio
   */
  adaptStats(response: ApiResponse): ProduccionStats {
    if (!response.stats) {
      return {
        totalPendientes: 0,
        enHorno: 0,
        finalizadosHoy: 0
      };
    }
    return {
      totalPendientes: response.stats.pendientes ?? 0,
      enHorno: response.stats.horno ?? 0,
      finalizadosHoy: response.stats.finalizados ?? 0
    };
  }

  private mapEstado(estado: string): EstadoPedido {
    switch (estado) {
      case 'Pendiente': return 'Pendiente';
      case 'En Proceso': return 'En Proceso';
      case 'Finalizado': return 'Finalizado';
      default: return 'Pendiente';
    }
  }
}
