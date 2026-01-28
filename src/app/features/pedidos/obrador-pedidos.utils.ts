import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { ObradorProductSummary, ObradorTallaGroup, ObradorTimeSlotGroup } from './obrador-pedidos.model';
import { isToday } from './pedidos-date.utils';

export const isUrgent = (date: any): boolean => {
  if (!date) return false;
  const d = (date instanceof Date) ? date : new Date(date);
  if (!isToday(d)) return false;

  const now = new Date();
  const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours < 3; // Menos de 3 horas para la entrega
};

export const belongsToFamilia = (p: Pedido, familia: string): boolean => {
  // Intento simple de macheo si el nombre no contiene la familia explícitamente
  return p.producto.toLowerCase().includes(familia.toLowerCase());
};

export const groupPedidosByTimeSlot = (pedidos: Pedido[], useSlots: boolean): ObradorTimeSlotGroup[] => {
  const getProductGroups = (list: Pedido[]) => {
    const productMap = new Map<string, ObradorProductSummary>();

    list.forEach(p => {
      if (!productMap.has(p.producto)) {
        productMap.set(p.producto, {
          producto: p.producto,
          tallaGroups: [],
          totalCantidad: 0,
          estadoGlobal: 'Pendiente',
          isUrgent: false
        });
      }

      const pg = productMap.get(p.producto)!;
      pg.totalCantidad += p.cantidad;
      if (isUrgent(p.fechaEntrega)) pg.isUrgent = true;

      let tg = pg.tallaGroups.find(g => g.talla === p.talla);
      if (!tg) {
        tg = { talla: p.talla, totalCantidad: 0, rellenoSummary: [], pedidos: [], estadoGlobal: 'Pendiente', hasAnyNotes: false };
        pg.tallaGroups.push(tg);
      }
      tg.totalCantidad += p.cantidad;
      tg.pedidos.push(p);
      if (p.notasPastelero) tg.hasAnyNotes = true;

      // Agregamos al resumen de rellenos
      let rg = tg.rellenoSummary.find(r => r.relleno === p.relleno);
      if (!rg) {
        rg = { relleno: p.relleno, cantidad: 0, hasNotes: false };
        tg.rellenoSummary.push(rg);
      }
      rg.cantidad += p.cantidad;
      if (p.notasPastelero) rg.hasNotes = true;
    });

    productMap.forEach(pg => {
      pg.tallaGroups.forEach(tg => {
        if (tg.pedidos.every(p => p.estado === 'Terminado' || p.estado === 'Entregado')) {
          tg.estadoGlobal = 'Terminado';
        } else if (tg.pedidos.some(p => p.estado === 'En Proceso')) {
          tg.estadoGlobal = 'En Proceso';
        }
      });

      if (pg.tallaGroups.every(tg => tg.estadoGlobal === 'Terminado')) {
        pg.estadoGlobal = 'Terminado';
      } else if (pg.tallaGroups.some(tg => tg.estadoGlobal === 'En Proceso')) {
        pg.estadoGlobal = 'En Proceso';
      }
    });

    return Array.from(productMap.values());
  };

  if (!useSlots) {
    if (pedidos.length === 0) return [];
    return [{
      label: 'Toda la producción',
      productGroups: getProductGroups(pedidos)
    }];
  }

  const slots = [
    { label: 'Primera Hora Mañana (Hasta 11:00)', maxMinutes: 11 * 60 },
    { label: 'Medio Día (Hasta 14:00)', maxMinutes: 14 * 60 },
    { label: 'Primera Hora Tarde (Hasta 16:00)', maxMinutes: 16 * 60 },
    { label: 'Última Hora Tarde (Hasta 24:00)', maxMinutes: 24 * 60 }
  ];

  const grouped: ObradorTimeSlotGroup[] = [];
  slots.forEach((slot, index) => {
    const prevMax = index === 0 ? 0 : slots[index - 1].maxMinutes;
    const slotPedidos = pedidos.filter(p => {
      const date = new Date(p.fechaEntrega);
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      return totalMinutes >= prevMax && totalMinutes < slot.maxMinutes;
    });

    if (slotPedidos.length > 0) {
      grouped.push({
        label: slot.label,
        productGroups: getProductGroups(slotPedidos)
      });
    }
  });

  return grouped;
};

export const countByStatus = (tg: ObradorTallaGroup, status: EstadoPedido): number =>
  tg.pedidos.filter(p => p.estado === status).length;

export const hasPending = (tg: ObradorTallaGroup): boolean =>
  tg.pedidos.some(p => p.estado === 'Pendiente');

export const hasInProcess = (tg: ObradorTallaGroup): boolean =>
  tg.pedidos.some(p => p.estado === 'En Proceso');
