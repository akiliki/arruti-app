import { Injectable } from '@angular/core';
import { Pedido, ProduccionStats, EstadoPedido } from '../models/pedido.model';
import { Producto } from '../models/producto.model';
import { Empleado } from '../models/empleado.model';
import { Receta } from '../models/receta.model';

interface ApiResponse {
  status: string;
  data: Array<{
    id: string;
    id_grupo?: string;
    producto: string;
    talla?: string;
    relleno?: string;
    cantidad: number;
    fecha: string;
    estado_actual: string;
    fecha_actualizacion?: string;
    nombre_cliente?: string;
    notas_pastelero?: string;
    notas_tienda?: string;
    vendedor?: string;
    guardado_tienda?: boolean | string;
  }>;
  stats: {
    pendientes: number;
    horno: number;
    producidos: number;
    entregados: number;
  };
}

interface ProductApiResponse {
  status: string;
  data: Array<{
    id_producto: string;
    familia: string;
    nombre: string;
    raciones_tallas: string | number; // Can be string or number from Sheets
    rellenos: string;
  }>;
}

interface RecetaApiResponse {
  status: string;
  data: Array<{
    id: string;
    id_producto: string;
    nombre_producto: string;
    raciones: string;
    ingredientes: string;
    pasos: string;
    tiempo_total: string;
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
      idGrupo: item.id_grupo,
      producto: item.producto,
      talla: item.talla,
      relleno: item.relleno,
      cantidad: item.cantidad,
      fechaEntrega: this.parseDate(item.fecha),
      estado: this.mapEstado(item.estado_actual),
      fechaActualizacion: item.fecha_actualizacion ? this.parseDate(item.fecha_actualizacion) : undefined,
      nombreCliente: item.nombre_cliente,
      notasPastelero: item.notas_pastelero,
      notasTienda: item.notas_tienda,
      vendedor: item.vendedor,
      guardadoEnTienda: item.guardado_tienda === true || item.guardado_tienda === 'TRUE' || item.guardado_tienda === 'SI'
    }));
  }

  private parseDate(dateStr: any): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    
    // Si ya es un ISO string o formato estándar que entiende Date
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    // Si viene en formato DD/MM/YYYY (común en Sheets de España)
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const timePart = dateStr.split(' ')[1] || '00:00:00';
        const timeParts = timePart.split(':');
        return new Date(year, month, day, 
          parseInt(timeParts[0] || '0', 10), 
          parseInt(timeParts[1] || '0', 10), 
          parseInt(timeParts[2] || '0', 10));
      }
    }
    
    return d; // Si todo falla devuelve la Invalid Date o lo que salió al inicio
  }

  /**
   * Transforma productos de la API al modelo de dominio
   */
  adaptProductos(response: ProductApiResponse): Producto[] {
    return (response.data || []).map(item => {
      let tallas: string[] = [];
      const val = item.raciones_tallas;
      
      if (val !== undefined && val !== null) {
        const strVal = String(val).trim();
        if (strVal !== '') {
          // Aceptamos comas, barras o puntos y coma como separadores
          tallas = strVal.split(/[,/;|]+/).map(s => s.trim()).filter(s => s !== '');
        }
      }

      return {
        id: item.id_producto,
        familia: item.familia || 'Sin Familia',
        producto: item.nombre || 'Sin nombre',
        tallasRaciones: tallas,
        rellenos: item.rellenos ? item.rellenos.split(/[,/;|]+/).map(s => s.trim()).filter(s => s !== '') : []
      };
    });
  }

  /**
   * Transforma recetas de la API al modelo de dominio
   */
  adaptRecetas(response: RecetaApiResponse): Receta[] {
    return (response.data || []).map(item => {
      let ingredientes: any[] = [];
      try {
        if (item.ingredientes && String(item.ingredientes).startsWith('[')) {
          ingredientes = JSON.parse(String(item.ingredientes));
        } else if (item.ingredientes) {
          ingredientes = [{ nombre: String(item.ingredientes), cantidad: '', unidad: '' }];
        }
      } catch (e) {
        ingredientes = [{ nombre: String(item.ingredientes), cantidad: '', unidad: '' }];
      }

      return {
        id: item.id,
        idProducto: item.id_producto,
        nombreProducto: item.nombre_producto,
        raciones: item.raciones,
        ingredientes: ingredientes,
        pasos: item.pasos,
        tiempoTotal: item.tiempo_total
      };
    });
  }

  /**
   * Prepara un producto para ser enviado a la API
   */
  prepareProductoForPost(producto: Producto): any {
    return {
      id_producto: producto.id,
      familia: producto.familia,
      nombre: producto.producto,
      raciones_tallas: producto.tallasRaciones.join(', '),
      rellenos: producto.rellenos.join(', ')
    };
  }

  /**   * Prepara una receta para ser enviada a la API
   */
  prepareRecetaForPost(receta: Receta): any {
    return {
      id: receta.id,
      id_producto: receta.idProducto,
      nombre_producto: receta.nombreProducto,
      raciones: receta.raciones,
      ingredientes: JSON.stringify(receta.ingredientes),
      pasos: receta.pasos,
      tiempo_total: receta.tiempoTotal
    };
  }

  /**   * Transforma las estadísticas de la API al modelo de dominio
   */
  adaptStats(response: ApiResponse): ProduccionStats {
    if (!response.stats) {
      return {
        totalPendientes: 0,
        enHorno: 0,
        producidosHoy: 0,
        entregadosHoy: 0
      };
    }
    return {
      totalPendientes: response.stats.pendientes ?? 0,
      enHorno: response.stats.horno ?? 0,
      producidosHoy: response.stats.producidos ?? 0,
      entregadosHoy: response.stats.entregados ?? 0
    };
  }

  /**
   * Transforma empleados de la API al modelo de dominio
   */
  adaptEmpleados(response: any): Empleado[] {
    return (response.data || []).map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      activo: !!item.activo
    }));
  }

  /**
   * Prepara un pedido para ser enviado a la API
   */
  prepareForPost(pedido: Partial<Pedido>): any {
    return {
      id: pedido.id,
      id_grupo: pedido.idGrupo || '',
      producto: pedido.producto,
      talla: pedido.talla || '',
      relleno: pedido.relleno || '',
      cantidad: pedido.cantidad,
      fechaEntrega: pedido.fechaEntrega instanceof Date ? pedido.fechaEntrega.toISOString() : pedido.fechaEntrega,
      estado: pedido.estado || 'Pendiente',
      nombre_cliente: pedido.nombreCliente || '',
      notas_pastelero: pedido.notasPastelero || '',
      notas_tienda: pedido.notasTienda || '',
      vendedor: pedido.vendedor || '',
      guardado_tienda: pedido.guardadoEnTienda ? 'SI' : 'NO'
    };
  }

  private mapEstado(estado: string): EstadoPedido {
    if (!estado) return 'Pendiente';
    const s = String(estado).trim().toLowerCase();
    
    switch (s) {
      case 'pendiente': 
        return 'Pendiente';
      case 'en proceso': 
      case 'en curso': 
      case 'horno':
        return 'En Proceso';
      case 'terminado': 
      case 'producido': 
      case 'finalizado': 
      case 'listo':
        return 'Terminado';
      case 'entregado': 
        return 'Entregado';
      case 'cancelado': 
        return 'Cancelado';
      default: 
        return 'Pendiente';
    }
  }
}
