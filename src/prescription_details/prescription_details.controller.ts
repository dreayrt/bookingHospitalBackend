import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrescriptionDetailsService } from './prescription_details.service';
import { CreatePrescriptionDetailDto } from './dto/create-prescription_detail.dto';
import { UpdatePrescriptionDetailDto } from './dto/update-prescription_detail.dto';

@Controller('prescription-details')
export class PrescriptionDetailsController {
  constructor(private readonly prescriptionDetailsService: PrescriptionDetailsService) {}

  @Post()
  create(@Body() createPrescriptionDetailDto: CreatePrescriptionDetailDto) {
    return this.prescriptionDetailsService.create(createPrescriptionDetailDto);
  }

  @Get()
  findAll() {
    return this.prescriptionDetailsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prescriptionDetailsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePrescriptionDetailDto: UpdatePrescriptionDetailDto) {
    return this.prescriptionDetailsService.update(+id, updatePrescriptionDetailDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prescriptionDetailsService.remove(+id);
  }
}
