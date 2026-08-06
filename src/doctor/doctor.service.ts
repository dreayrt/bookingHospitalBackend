import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// import { CreateDoctorDto } from './dto/create-doctor.dto';
// import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(private readonly prisma: PrismaService) {}
  // create(createDoctorDto: CreateDoctorDto) {
  //   return 'This action adds a new doctor';
  // }

  async findAll() {
    const doctors = await this.prisma.doctors.findMany({
      select: {
        id: true,
        department_id: true,
        specialization: true,
        license_number: true,
        experience_years: true,
        status: true,
        departments: {
          select: {
            name: true,
            description: true,
          },
        },
        users: {
          select: {
            full_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    return doctors.map((item) => ({
      id: item.id.toString(),
      department_id: item.department_id ? item.department_id.toString() : null,
      specialization: item.specialization,
      license_number: item.license_number,
      experience_years: item.experience_years,
      status: item.status,
      full_name: item.users?.full_name || `BS. ${item.id}`,
      email: item.users?.email,
      phone: item.users?.phone,
      department_name: item.departments?.name,
      department_desc: item.departments?.description,
      deparment_name: item.departments?.name,
      deparment_desc: item.departments?.description,
    }));
  }

  async findByDepartment(departmentId: string) {
    const doctors = await this.prisma.doctors.findMany({
      where: {
        department_id: BigInt(departmentId),
      },
      select: {
        id: true,
        department_id: true,
        specialization: true,
        license_number: true,
        experience_years: true,
        status: true,
        departments: {
          select: {
            name: true,
            description: true,
          },
        },
        users: {
          select: {
            full_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    return doctors.map((item) => ({
      id: item.id.toString(),
      department_id: item.department_id ? item.department_id.toString() : null,
      specialization: item.specialization,
      license_number: item.license_number,
      experience_years: item.experience_years,
      status: item.status,
      full_name: item.users?.full_name || `BS. ${item.id}`,
      email: item.users?.email,
      phone: item.users?.phone,
      department_name: item.departments?.name,
      department_desc: item.departments?.description,
    }));
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} doctor`;
  // }

  // update(id: number, updateDoctorDto: UpdateDoctorDto) {
  //   return `This action updates a #${id} doctor`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} doctor`;
  // }
}
