export type EstadoPedido = 'Pendiente' | 'En Proceso' | 'Finalizado';

export interface Pedido {
  id: string;
  producto: string;
  cantidad: number;
  fechaEntrega: Date;
  estado: EstadoPedido;
  fechaActualizacion?: Date;
}

export interface ProduccionStats {
  totalPendientes: number;
  enHorno: number;
  finalizadosHoy: number;
}
