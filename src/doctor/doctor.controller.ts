import {
  Controller,
  Get,
  Param,
  // Post, Body, Patch,
  // Delete
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
// import { CreateDoctorDto } from './dto/create-doctor.dto';
// import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Controller('doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // @Post()
  // create(@Body() createDoctorDto: CreateDoctorDto) {
  //   return this.doctorService.create(createDoctorDto);
  // }

  @Get()
  findAll() {
    return this.doctorService.findAll();
  }

  @Get('by-department/:departmentId')
  findByDepartment(@Param('departmentId') departmentId: string) {
    return this.doctorService.findByDepartment(departmentId);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.doctorService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
  //   return this.doctorService.update(+id, updateDoctorDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.doctorService.remove(+id);
  // }
}
