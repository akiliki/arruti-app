import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Check if user is already logged in (mock)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(email: string, password: string): Observable<boolean> {
    // Mock login logic con perfiles solicitados
    const mockUsers: any[] = [
      { email: 'admin@arruti.eus', password: 'Aitor12345', nombre: 'Admin', perfilId: 'admin' },
      { email: 'joxe@arruti.eus', password: 'Joxe12345', nombre: 'Joxe', perfilId: 'obrador-repo' },
      { email: 'sonia@arruti.eus', password: 'Sonia12345', nombre: 'Sonia', perfilId: 'tienda-repo' },
      { email: 'amatza@arruti.eus', password: 'Amatza12345', nombre: 'Amatza', perfilId: 'tienda-emp' },
      { email: 'aitor@arruti.eus', password: 'Aitor', nombre: 'Aitor', perfilId: 'obrador-emp' }
    ];

    const found = mockUsers.find(u => u.email === email && u.password === password);
    
    if (found) {
      const user: Usuario = {
        id: Math.random().toString(36).substr(2, 9),
        nombre: found.nombre,
        email: found.email,
        perfilId: found.perfilId,
        activo: true
      };
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
      return of(true);
    }
    return of(false);
  }

  getDefaultRoute(perfilId: string): string {
    switch (perfilId) {
      case 'obrador-repo':
      case 'obrador-emp':
        return '/obrador';
      case 'tienda-repo':
      case 'tienda-emp':
        return '/pedidos'; // Tienda
      case 'admin':
        return '/pedidos'; 
      default:
        return '/pedidos';
    }
  }

  hasPermission(perfilId: string, menuOption: string): boolean {
    const permissions: Record<string, string[]> = {
      'admin': ['tienda', 'obrador', 'catalogo', 'seguridad'],
      'obrador-repo': ['tienda', 'obrador', 'catalogo'],
      'tienda-repo': ['tienda', 'catalogo'],
      'tienda-emp': ['tienda'],
      'obrador-emp': ['obrador']
    };

    const userPerms = permissions[perfilId] || [];
    return userPerms.includes(menuOption);
  }

  logout() {
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }
}
