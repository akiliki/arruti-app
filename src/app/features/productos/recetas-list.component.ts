import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Receta } from '../../core/models/receta.model';

@Component({
  selector: 'app-recetas-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div *ngIf="recetas && recetas.length > 0; else noRecetas" class="table-container">
      <table class="main-table">
        <thead>
          <tr>
            <th *ngIf="showProductColumn">Producto</th>
            <th>Raciones</th>
            <th>Tiempo</th>
            <th>Resumen Ingredientes</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of recetas">
            <td *ngIf="showProductColumn" class="bold">{{ r.nombreProducto }}</td>
            <td>{{ r.raciones }}</td>
            <td><span class="time-tag">⏱ {{ r.tiempoTotal }}</span></td>
            <td>
              <div class="ing-pill-list">
                <span *ngFor="let ing of r.ingredientes | slice:0:3" class="ing-pill">
                  {{ ing.nombre }}
                </span>
                <span *ngIf="r.ingredientes.length > 3" class="ing-more">
                  +{{ r.ingredientes.length - 3 }} más
                </span>
              </div>
            </td>
            <td>
              <div class="actions">
                <button class="btn-view" [routerLink]="['/recetas', r.id]" title="Ver Receta">Ver</button>
                <button class="btn-prod" [routerLink]="['/productos', r.idProducto]" title="Ir al Producto">Producto</button>
                <button class="btn-edit" [routerLink]="['/productos', r.idProducto, 'receta', r.id]" title="Editar Receta">Editar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ng-template #noRecetas>
      <div class="empty-recetas">
        <p>No hay recetas registradas.</p>
      </div>
    </ng-template>
  `,
  styleUrl: './recetas-list.component.scss'
})
export class RecetasListComponent {
  @Input({ required: true }) recetas: Receta[] = [];
  @Input() showProductColumn: boolean = true;
}
