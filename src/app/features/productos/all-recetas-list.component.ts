import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecetaService } from '../../core/services/receta.service';
import { Receta } from '../../core/models/receta.model';
import { Observable } from 'rxjs';
import { RecetasListComponent } from './recetas-list.component';

@Component({
  selector: 'app-all-recetas-list',
  standalone: true,
  imports: [CommonModule, RecetasListComponent],
  template: `
    <div class="list-container">
      <div class="header">
        <h2>Libro de Recetas</h2>
      </div>

      <div *ngIf="recetas$ | async as recetas; else loadingOrError" class="content">
        <app-recetas-list [recetas]="recetas"></app-recetas-list>
      </div>

      <ng-template #loadingOrError>
        <div *ngIf="error" class="error-state">
          <p>{{ error }}</p>
          <button class="btn-retry" (click)="loadRecetas()">Reintentar</button>
        </div>
        <div *ngIf="!error" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando libro de recetas...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .list-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .header { margin-bottom: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; }
    .header h2 { color: #1e293b; margin: 0; font-size: 2rem; }
    
    .loading-state, .error-state { text-align: center; padding: 4rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .spinner { border: 4px solid #f1f5f9; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .btn-retry { background: #3b82f6; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
  `]
})
export class AllRecetasListComponent implements OnInit {
  private recetaService = inject(RecetaService);
  recetas$!: Observable<Receta[]>;
  error: string | null = null;

  ngOnInit(): void {
    this.loadRecetas();
  }

  loadRecetas(): void {
    this.error = null;
    this.recetas$ = this.recetaService.getRecetas();
  }
}
