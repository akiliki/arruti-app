import { TestBed } from '@angular/core/testing';
import { ProductionService } from './production.service';

describe('ProductionService', () => {
  let service: ProductionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return dummy production stats', (done) => {
    service.getDashboardStats().subscribe(stats => {
      expect(stats).toBeDefined();
      expect(stats.totalPendientes).toBe(12);
      done();
    });
  });
});
