import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductoService } from './producto.service';
import { environment } from '../../../environments/environment';

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

    service.getProductos().subscribe(productos => {
      expect(productos.length).toBe(1);
      expect(productos[0].producto).toBe('Croissant');
      expect(productos[0].id).toBe('1');
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}?type=productos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
