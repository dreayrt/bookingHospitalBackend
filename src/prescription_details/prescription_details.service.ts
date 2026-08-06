import { Injectable } from '@nestjs/common';
import { CreatePrescriptionDetailDto } from './dto/create-prescription_detail.dto';
import { UpdatePrescriptionDetailDto } from './dto/update-prescription_detail.dto';

@Injectable()
export class PrescriptionDetailsService {
  create(createPrescriptionDetailDto: CreatePrescriptionDetailDto) {
    return 'This action adds a new prescriptionDetail';
  }

  findAll() {
    return `This action returns all prescriptionDetails`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prescriptionDetail`;
  }

  update(id: number, updatePrescriptionDetailDto: UpdatePrescriptionDetailDto) {
    return `This action updates a #${id} prescriptionDetail`;
  }

  remove(id: number) {
    return `This action removes a #${id} prescriptionDetail`;
  }
}
