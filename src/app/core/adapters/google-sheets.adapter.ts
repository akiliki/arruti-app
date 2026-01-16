import { Injectable } from '@angular/core';
import { Pedido, ProduccionStats, EstadoPedido } from '../models/pedido.model';
import { Producto } from '../models/producto.model';

interface ApiResponse {
  status: string;
  data: Array<{
    id: string;
    producto: string;
    cantidad: number;
    fecha: string;
    estado_actual: string;
    fecha_actualizacion?: string;
    nombre_cliente?: string;
    notas_pastelero?: string;
    notas_tienda?: string;
  }>;
  stats: {
    pendientes: number;
    horno: number;
    finalizados: number;
  };
}

interface ProductApiResponse {
  status: string;
  data: Array<{
    id_producto: string;
    familia: string;
    nombre: string;
    raciones_tallas: string; // Comma separated string
  }>;
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
      fechaActualizacion: item.fecha_actualizacion ? new Date(item.fecha_actualizacion) : undefined,
      nombreCliente: item.nombre_cliente,
      notasPastelero: item.notas_pastelero,
      notasTienda: item.notas_tienda
    }));
  }

  /**
   * Transforma productos de la API al modelo de dominio
   */
  adaptProductos(response: ProductApiResponse): Producto[] {
    return response.data.map(item => ({
      id: item.id_producto,
      familia: item.familia,
      producto: item.nombre,
      tallasRaciones: item.raciones_tallas ? item.raciones_tallas.split(',').map(s => s.trim()) : []
    }));
  }

  /**
   * Prepara un producto para ser enviado a la API
   */
  prepareProductoForPost(producto: Producto): any {
    return {
      id_producto: producto.id,
      familia: producto.familia,
      nombre: producto.producto,
      raciones_tallas: producto.tallasRaciones.join(', ')
    };
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
      id: pedido.id,
      producto: pedido.producto,
      cantidad: pedido.cantidad,
      fechaEntrega: pedido.fechaEntrega instanceof Date ? pedido.fechaEntrega.toISOString() : pedido.fechaEntrega,
      estado: pedido.estado || 'Pendiente',
      nombre_cliente: pedido.nombreCliente || '',
      notas_pastelero: pedido.notasPastelero || '',
      notas_tienda: pedido.notasTienda || ''
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
