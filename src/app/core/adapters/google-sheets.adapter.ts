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
    return {
      totalPendientes: response.stats.pendientes,
      enHorno: response.stats.horno,
      finalizadosHoy: response.stats.finalizados
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
