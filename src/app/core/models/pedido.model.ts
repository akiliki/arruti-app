export type EstadoPedido = 'Pendiente' | 'En Proceso' | 'Producido' | 'Entregado';

export interface Pedido {
  id: string;
  producto: string;
  cantidad: number;
  fechaEntrega: Date;
  estado: EstadoPedido;
  fechaActualizacion?: Date;
  nombreCliente?: string;
  notasPastelero?: string;
  notasTienda?: string;
}

export interface ProduccionStats {
  totalPendientes: number;
  enHorno: number;
  producidosHoy: number;
  entregadosHoy: number;
}
