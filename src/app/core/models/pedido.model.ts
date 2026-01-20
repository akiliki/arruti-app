export type EstadoPedido = 'Pendiente' | 'En Proceso' | 'Terminado' | 'Entregado' | 'Cancelado';

export interface Pedido {
  id: string;
  idGrupo?: string;
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
  guardadoEnTienda?: boolean; // Nuevo campo: el producto ya está en tienda
}

export interface ProduccionStats {
  totalPendientes: number;
  enHorno: number;
  producidosHoy: number;
  entregadosHoy: number;
}
