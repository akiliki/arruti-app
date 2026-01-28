import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <ng-content></ng-content>
      <p *ngIf="title">{{ title }}</p>
      <small *ngIf="subtitle">{{ subtitle }}</small>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
}
