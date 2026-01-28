import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pedidos-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div [class.header-section]="variant === 'list'" [class.header]="variant !== 'list'">
      <button
        *ngIf="backText"
        class="btn-back"
        [routerLink]="backLink"
        (click)="back.emit()"
      >
        {{ backText }}
      </button>
      <ng-container [ngSwitch]="titleLevel">
        <h1 *ngSwitchCase="1">{{ title }}</h1>
        <h2 *ngSwitchDefault>{{ title }}</h2>
      </ng-container>
      <ng-content select="[header-actions]"></ng-content>
    </div>
  `
})
export class PedidosHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() backText?: string;
  @Input() backLink?: string | any[];
  @Input() variant: 'list' | 'detail' = 'detail';
  @Input() titleLevel: 1 | 2 = 2;

  @Output() back = new EventEmitter<void>();
}
