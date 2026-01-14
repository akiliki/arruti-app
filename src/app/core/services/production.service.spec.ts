import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductionService } from './production.service';
import { environment } from '../../../environments/environment';

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
        finalizados: 10
      }
    };

    service.getDashboardStats().subscribe(stats => {
      expect(stats.totalPendientes).toBe(5);
      expect(stats.enHorno).toBe(2);
      expect(stats.finalizadosHoy).toBe(10);
      done();
    });

    const req = httpMock.expectOne(environment.apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle API errors and return localized error message', (done) => {
    service.getDashboardStats().subscribe({
      next: () => fail('should have failed with an error'),
      error: (error) => {
        expect(error.message).toContain('No se pudo cargar la información de producción');
        done();
      }
    });

    const req = httpMock.expectOne(environment.apiUrl);
    req.flush('Error de servidor', { status: 500, statusText: 'Internal Server Error' });
  });
});
