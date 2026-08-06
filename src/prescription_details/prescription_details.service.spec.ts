import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionDetailsService } from './prescription_details.service';

describe('PrescriptionDetailsService', () => {
  let service: PrescriptionDetailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrescriptionDetailsService],
    }).compile();

    service = module.get<PrescriptionDetailsService>(PrescriptionDetailsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
