import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductoService } from './producto.service';
import { environment } from '../../../environments/environment';
import { filter } from 'rxjs';

describe('ProductoService', () => {
  let service: ProductoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductoService]
    });
    service = TestBed.inject(ProductoService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(console, 'error');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return adapted productos from API', (done) => {
    const mockResponse = {
      status: 'success',
      data: [
        { id_producto: '1', familia: 'Bollería', nombre: 'Croissant', raciones_tallas: 'Individual' }
      ]
    };

    service.getProductos().pipe(
      filter(p => p.length > 0)
    ).subscribe(productos => {
      expect(productos.length).toBe(1);
      expect(productos[0].producto).toBe('Croissant');
      expect(productos[0].id).toBe('1');
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}?type=productos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should update signal optimistically when adding a product', () => {
    service.addProducto({ familia: 'B', producto: 'Optimista', tallasRaciones: [], rellenos: [] }).subscribe();

    // El signal debe tener el nuevo valor INMEDIATAMENTE
    expect(service.productosSignal().some(p => p.producto === 'Optimista')).toBeTrue();

    // Limpiamos la petición pendiente para el verify()
    const req = httpMock.expectOne(environment.apiUrl);
    req.flush({ status: 'success' });
  });

  it('should rollback signal if adding a product fails', () => {
    service.addProducto({ familia: 'B', producto: 'Falla', tallasRaciones: [], rellenos: [] }).subscribe({
      error: () => {} 
    });

    const req = httpMock.expectOne(environment.apiUrl);
    req.flush({ status: 'error', message: 'Backend Down' });

    expect(service.productosSignal().some(p => p.producto === 'Falla')).toBeFalse();
  });

  it('should update signal optimistically when updating a product', () => {
    // Primero añadimos uno
    const productoOriginal = { id: 'edit-1', familia: 'A', producto: 'Original', tallasRaciones: [], rellenos: [] };
    // Simulamos carga inicial
    service['productosState'].next([productoOriginal]);

    const productoEditado = { ...productoOriginal, producto: 'Cambiado' };
    service.updateProducto(productoEditado).subscribe();

    expect(service.productosSignal().find(p => p.id === 'edit-1')?.producto).toBe('Cambiado');

    const req = httpMock.expectOne(environment.apiUrl);
    req.flush({ status: 'success' });
  });
});
