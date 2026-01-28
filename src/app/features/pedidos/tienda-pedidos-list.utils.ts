import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { formatDate } from './pedidos-date.utils';

export interface TiendaPedidosListFilters {
  estado: EstadoPedido | '' | null | undefined;
  producto: string | null | undefined;
  fecha: string | null | undefined;
  nombre: string | null | undefined;
}

export const filterAndGroupTiendaPedidos = (
  pedidos: Pedido[],
  { estado, producto, fecha, nombre }: TiendaPedidosListFilters
): Pedido[] => {
  const filtered = pedidos.filter(p => {
    let matchEstado = true;
    if (estado === 'Pendiente') {
      matchEstado = p.estado !== 'Entregado' && p.estado !== 'Cancelado';
    } else if (estado) {
      matchEstado = p.estado === estado;
    } else {
      matchEstado = p.estado !== 'Entregado' && p.estado !== 'Cancelado'; // Default: activos
    }

    const matchProducto = !producto || p.producto.toLowerCase().includes(producto.toLowerCase());
    const matchFecha = !fecha || formatDate(p.fechaEntrega) === fecha;
    const matchNombre = !nombre || (p.nombreCliente && p.nombreCliente.toLowerCase().includes(nombre.toLowerCase()));
    return matchEstado && matchProducto && matchFecha && matchNombre;
  });

  // Agrupar por idGrupo
  const groups = new Map<string, Pedido[]>();
  filtered.forEach(p => {
    const key = p.idGrupo || p.id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  });

  const result: Pedido[] = [];
  groups.forEach((items) => {
    if (items.length === 1) {
      result.push(items[0]);
    } else {
      const base = items[0];
      const extraCount = items.length - 1;
      result.push({
        ...base,
        producto: `${base.producto} + ${extraCount} más`
        // El estado del grupo será el del primero, o podrías calcular el "mínimo"
      });
    }
  });

  return result.sort((a, b) => {
    const dateA = new Date(a.fechaEntrega).getTime();
    const dateB = new Date(b.fechaEntrega).getTime();
    return dateA - dateB;
  });
};
