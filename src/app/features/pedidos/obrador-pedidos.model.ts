import { Pedido, EstadoPedido } from '../../core/models/pedido.model';

export interface ObradorTallaGroup {
  talla?: string;
  totalCantidad: number;
  rellenoSummary: { relleno?: string; cantidad: number; hasNotes: boolean }[];
  pedidos: Pedido[];
  estadoGlobal: EstadoPedido;
  hasAnyNotes: boolean;
  expanded?: boolean; // Para mostrar/ocultar notas
}

export interface ObradorProductSummary {
  producto: string;
  tallaGroups: ObradorTallaGroup[];
  totalCantidad: number;
  estadoGlobal: EstadoPedido;
  isUrgent: boolean;
}

export interface ObradorTimeSlotGroup {
  label: string;
  productGroups: ObradorProductSummary[];
}
