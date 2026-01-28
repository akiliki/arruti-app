import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pedido-notes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notes-section" *ngIf="hasNotes">
      <div class="note-box tienda" *ngIf="showTienda && notasTienda">
        <label>{{ tiendaLabel }}</label>
        <p>{{ notasTienda }}</p>
      </div>

      <div class="note-box pastelero" *ngIf="showPastelero && notasPastelero">
        <label>{{ pasteleroLabel }}</label>
        <p>{{ notasPastelero }}</p>
      </div>
    </div>
  `
})
export class PedidoNotesComponent {
  @Input() notasTienda?: string | null;
  @Input() notasPastelero?: string | null;
  @Input() mode: 'tienda' | 'obrador' | 'dual' = 'dual';
  @Input() tiendaLabel = 'Notas de Tienda';
  @Input() pasteleroLabel = 'Notas de Obrador';

  get showTienda(): boolean {
    return this.mode === 'tienda' || this.mode === 'dual';
  }

  get showPastelero(): boolean {
    return this.mode === 'obrador' || this.mode === 'dual';
  }

  get hasNotes(): boolean {
    return (!!this.notasTienda && this.showTienda) || (!!this.notasPastelero && this.showPastelero);
  }
}
