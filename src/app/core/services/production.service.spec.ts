import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductionService } from './production.service';
import { environment } from '../../../environments/environment';
import { EstadoPedido } from '../models/pedido.model';

describe('ProductionService', () => {
  let service: ProductionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductionService]
    });
    service = TestBed.inject(ProductionService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Silenciar console.error durante las pruebas para evitar confusión en la salida
    spyOn(console, 'error');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return adapted production stats from API', (done) => {
    const mockResponse = {
      status: 'success',
      data: [],
      stats: {
        pendientes: 5,
        horno: 2,
        producidos: 10,
        entregados: 3
      }
    };

    service.getDashboardStats().subscribe(stats => {
      // Solo nos interesa la emisión con datos reales
      if (stats.totalPendientes === 5) {
        expect(stats.totalPendientes).toBe(5);
        expect(stats.enHorno).toBe(2);
        expect(stats.producidosHoy).toBe(10);
        expect(stats.entregadosHoy).toBe(3);
        done();
      }
    });

    const req = httpMock.expectOne(environment.apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle API errors and return localized error message', (done) => {
    service.getDashboardStats().subscribe({
      next: (stats) => {
        // Ignoramos el estado inicial si existe
      },
      error: (error) => {
        expect(error.message).toContain('No se pudo cargar la información de producción');
        done();
      }
    });

    const req = httpMock.expectOne(environment.apiUrl);
    req.flush('Error de servidor', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should update pedidos signal optimistically when adding an order', () => {
    service.addPedido({ producto: 'Pedido Optimista' }).subscribe();

    expect(service.pedidosSignal().some(p => p.producto === 'Pedido Optimista')).toBeTrue();
    
    const req = httpMock.expectOne(environment.apiUrl);
    req.flush({ status: 'success' });
  });

  it('should rollback pedidos when adding an order fails', () => {
    service.addPedido({ producto: 'Pedido Fallido' }).subscribe({
      error: () => {}
    });

    const req = httpMock.expectOne(environment.apiUrl);
    // Simulamos respuesta de error de Google Apps Script
    req.flush({ status: 'error', message: 'Error de prueba' });

    expect(service.pedidosSignal().some(p => p.producto === 'Pedido Fallido')).toBeFalse();
  });

  it('should update order status optimistically', () => {
    // 1. Añadimos uno primero
    service.addPedido({ id: '123', producto: 'P1', estado: 'Pendiente' as EstadoPedido }).subscribe();
    httpMock.expectOne(environment.apiUrl).flush({ status: 'success' });

    // 2. Actualizamos estado
    service.updatePedidoStatus('123', 'En Proceso').subscribe();

    const p = service.pedidosSignal().find(p => p.id === '123');
    expect(p?.estado).toBe('En Proceso');

    const req = httpMock.expectOne(environment.apiUrl);
    req.flush({ status: 'success' });
  });
});
