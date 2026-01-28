import { Pipe, PipeTransform } from '@angular/core';
import { EstadoPedido } from '../../core/models/pedido.model';

@Pipe({
  name: 'pedidoStatusClass',
  standalone: true
})
export class PedidoStatusClassPipe implements PipeTransform {
  transform(value: EstadoPedido | string | null | undefined): string {
    if (!value) return '';
    return String(value).toLowerCase().replace(/\s+/g, '-');
  }
}
