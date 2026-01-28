import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vendedor-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="vendedor-badge" *ngIf="vendedor">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      {{ vendedor }}
    </span>
  `
})
export class VendedorBadgeComponent {
  @Input() vendedor?: string | null;
}
