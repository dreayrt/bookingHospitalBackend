import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionDetailsController } from './prescription_details.controller';
import { PrescriptionDetailsService } from './prescription_details.service';

describe('PrescriptionDetailsController', () => {
  let controller: PrescriptionDetailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrescriptionDetailsController],
      providers: [PrescriptionDetailsService],
    }).compile();

    controller = module.get<PrescriptionDetailsController>(PrescriptionDetailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
