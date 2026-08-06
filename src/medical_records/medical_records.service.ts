import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmrPrescriptionDto } from 'src/prescriptions/dto/create-emr-precription';
// import { CreateMedicalRecordDto } from './dto/create-medical_record.dto';
// import { UpdateMedicalRecordDto } from './dto/update-medical_record.dto';
import { PrismaService } from 'src/prisma/prisma.service';
export type TimeFrameType = 'day' | 'week' | 'month' | 'year';

@Injectable()
export class MedicalRecordsService {
  // create(createMedicalRecordDto: CreateMedicalRecordDto) {
  //   return 'This action adds a new medicalRecord';
  // }
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const medicalRecords = await this.prisma.medical_records.findMany({
      select: {
        id: true,
        diagnosis: true,
        symptoms: true,
        treatment_plan: true,
        notes: true,
        created_at: true,
        doctors: {
          select: {
            users: {
              select: {
                full_name: true,
              },
            },
          },
        },
        patients: {
          select: {
            users: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
    });
    return medicalRecords.map((item) => ({
      id: item.id.toString(),
      diagnosis: item.diagnosis,
      symptoms: item.symptoms,
      treatment_plan: item.treatment_plan,
      notes: item.notes,
      created_at: item.created_at,
      doctor_name: item.doctors?.users?.full_name,
      patient_name: item.patients?.users?.full_name,
    }));
  }

  async getPatientFlowSummary(startDate: Date, type:TimeFrameType ='day' ){
    const endDate=new Date(startDate)
    switch(type){
      case'day':
        endDate.setDate(endDate.getDate() +1)
        break;
      case'week':
        endDate.setDate(endDate.getDate() +7)
        break;
      case'month':
        endDate.setDate(endDate.getDate() +30)
        break;
      case'year':
        endDate.setDate(endDate.getDate() +365)
        break;
    }
    const totalRecord= await this.prisma.medical_records.count({
      where:{
        created_at:{
          gte: startDate,
          lte: endDate,
        }
      }
    })
    return {
      startDate,
      endDate,
      type,
      totalRecord,
    }
  }
  async createEmrPrescription(dto:CreateEmrPrescriptionDto){
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: BigInt(dto.appointmentId) },
    });
    if (!appointment) {
      throw new NotFoundException('Lịch hẹn khám không tồn tại!');
    }
    return  await this.prisma.$transaction(async (tx) => {
      const medicalRecord= await tx.medical_records.upsert({
        where:{
          appointment_id:BigInt(dto.appointmentId),
        },
        update:{
          symptoms: dto.symptoms,
          diagnosis: dto.diagnosis,
          treatment_plan: dto.treatmentPlan,
          notes: dto.notes,          
        },
        create:{
          appointment_id:BigInt(dto.appointmentId),
          symptoms: dto.symptoms,
          diagnosis: dto.diagnosis,
          treatment_plan: dto.treatmentPlan,
          notes: dto.notes,
          doctor_id:appointment.doctor_id,
          patient_id:appointment.patient_id,
        }
      })
      const prescription = await tx.prescriptions.upsert({
        where: { medical_record_id: medicalRecord.id },
        update: {}, // Đã có đơn thuốc tổng thì giữ nguyên
        create: {
          medical_record_id: medicalRecord.id,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id,
        },
      });
      // Xóa chi tiết thuốc cũ của đơn này (phòng trường hợp bác sĩ sửa đơn)
      // Sau đó insert mới danh sách thuốc
       await tx.prescription_details.deleteMany({
        where: { prescription_id: prescription.id },
      });
      if (dto.medicines && dto.medicines.length > 0) {
        await tx.prescription_details.createMany({
          data: dto.medicines.map((med) => ({
            prescription_id: prescription.id,
            medicine_name: med.medicineName,
            dosage: med.dosage || null,
            frequency: med.frequency || null,
            duration: med.duration || null,
            instruction: med.instruction || null,
          })),
        });
      }
       await tx.appointments.update({
        where: { id: appointment.id },
        data: { status: 'COMPLETED' },
      });
      await tx.appointments.update({
        where: { id: appointment.id },
        data: { status: 'COMPLETED' },
      });
      // 3. Trả ra kết quả chuẩn cho Frontend hiển thị thông báo thành công
      return {
        success: true,
        message: 'Lưu hồ sơ khám bệnh và kê đơn thuốc thành công!',
        data: {
          medicalRecordId: medicalRecord.id.toString(),
          prescriptionId: prescription.id.toString(),
          appointmentId: dto.appointmentId,
          medicineCount: dto.medicines?.length || 0,
        },
      };

    })
  }

  async getByAppointmentId(appointmentId: string) {
    const medicalRecord = await this.prisma.medical_records.findFirst({
      where: {
        appointment_id: BigInt(appointmentId),
      },
      include: {
        doctors: {
          select: {
            users: { select: { full_name: true } },
          },
        },
        patients: {
          select: {
            users: { select: { full_name: true } },
          },
        },
        prescriptions: {
          include: {
            prescription_details: true,
          },
        },
      },
    });

    if (!medicalRecord) {
      return null;
    }

    return {
      id: medicalRecord.id.toString(),
      appointmentId: medicalRecord.appointment_id?.toString(),
      symptoms: medicalRecord.symptoms,
      diagnosis: medicalRecord.diagnosis,
      treatmentPlan: medicalRecord.treatment_plan,
      notes: medicalRecord.notes,
      createdAt: medicalRecord.created_at,
      doctorName: medicalRecord.doctors?.users?.full_name,
      patientName: medicalRecord.patients?.users?.full_name,
      medicines: medicalRecord.prescriptions?.prescription_details
        ? medicalRecord.prescriptions.prescription_details.map((d) => ({
            id: d.id.toString(),
            medicineName: d.medicine_name,
            dosage: d.dosage,
            frequency: d.frequency,
            duration: d.duration,
            instruction: d.instruction,
          }))
        : [],
    };
  }

  async getByPatientId(patientId: string) {
    if (!patientId || patientId.trim() === '') {
      return [];
    }
    const trimmedId = patientId.trim();
    const whereConditions: any[] = [
      { patients: { patient_code: trimmedId } },
      { patients: { users: { username: trimmedId } } },
      { patients: { users: { email: trimmedId } } },
      { patients: { users: { phone: trimmedId } } },
    ];

    if (!isNaN(Number(trimmedId))) {
      const idVal = BigInt(trimmedId);
      whereConditions.push(
        { patient_id: idVal },
        { patients: { user_id: idVal } },
        { patients: { id: idVal } },
      );
    }

    const medicalRecords = await this.prisma.medical_records.findMany({
      where: {
        OR: whereConditions,
      },
      include: {
        doctors: {
          select: {
            users: { select: { full_name: true } },
          },
        },
        patients: {
          select: {
            users: { select: { full_name: true } },
          },
        },
        prescriptions: {
          include: {
            prescription_details: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return medicalRecords.map((medicalRecord) => ({
      id: medicalRecord.id.toString(),
      appointmentId: medicalRecord.appointment_id?.toString(),
      symptoms: medicalRecord.symptoms,
      diagnosis: medicalRecord.diagnosis,
      treatmentPlan: medicalRecord.treatment_plan,
      notes: medicalRecord.notes,
      createdAt: medicalRecord.created_at,
      doctorName: medicalRecord.doctors?.users?.full_name,
      patientName: medicalRecord.patients?.users?.full_name,
      medicines: medicalRecord.prescriptions?.prescription_details
        ? medicalRecord.prescriptions.prescription_details.map((d) => ({
            id: d.id.toString(),
            medicineName: d.medicine_name,
            dosage: d.dosage,
            frequency: d.frequency,
            duration: d.duration,
            instruction: d.instruction,
          }))
        : [],
    }));
  }
}

