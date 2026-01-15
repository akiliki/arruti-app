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
    fecha_actualizacion?: string;
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
      estado: this.mapEstado(item.estado_actual),
      fechaActualizacion: item.fecha_actualizacion ? new Date(item.fecha_actualizacion) : undefined
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

  /**
   * Prepara un pedido para ser enviado a la API
   */
  prepareForPost(pedido: Partial<Pedido>): any {
    return {
      producto: pedido.producto,
      cantidad: pedido.cantidad,
      fechaEntrega: pedido.fechaEntrega instanceof Date ? pedido.fechaEntrega.toISOString() : pedido.fechaEntrega,
      estado: pedido.estado || 'Pendiente'
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
