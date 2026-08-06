import { PartialType } from '@nestjs/mapped-types';
import { CreatePrescriptionDetailDto } from './create-prescription_detail.dto';

export class UpdatePrescriptionDetailDto extends PartialType(CreatePrescriptionDetailDto) {}
