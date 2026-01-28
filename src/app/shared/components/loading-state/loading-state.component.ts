import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-state">
      <ng-content></ng-content>
      <p *ngIf="text">{{ text }}</p>
    </div>
  `
})
export class LoadingStateComponent {
  @Input() text?: string;
}
