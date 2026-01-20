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
    // Mock login logic
    const mockUsers: any[] = [
      { email: 'admin@arruti.com', password: 'admin', nombre: 'Administrador', perfilId: 'admin' },
      { email: 'joxe@arruti.eus', password: 'AupaErreala', nombre: 'Joxe', perfilId: 'obrador' },
      { email: 'sonia@arruti.eus', password: 'IratiArruti', nombre: 'Sonia', perfilId: 'tienda' }
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

  logout() {
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }
}
