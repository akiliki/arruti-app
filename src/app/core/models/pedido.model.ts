export type EstadoPedido = 'Pendiente' | 'En Proceso' | 'Producido' | 'Entregado';

export interface Pedido {
  id: string;
  producto: string;
  talla?: string;   // Nuevo campo
  relleno?: string; // Nuevo campo
  cantidad: number;
  fechaEntrega: Date;
  estado: EstadoPedido;
  fechaActualizacion?: Date;
  nombreCliente?: string;
  notasPastelero?: string;
  notasTienda?: string;
  vendedor?: string; // Nuevo campo: quien recoge el pedido
}

export interface ProduccionStats {
  totalPendientes: number;
  enHorno: number;
  producidosHoy: number;
  entregadosHoy: number;
}
