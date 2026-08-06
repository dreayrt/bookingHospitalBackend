import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  role: 'patient' | 'doctor' | 'admin';
  targetId?: string;       // ID of patient, doctor, user, or 'ALL'
  email?: string;          // Patient email
  phone?: string;          // Patient phone
  type?: string;           // 'BOOKING_SUCCESS', 'NEW_QUEUE_PATIENT', etc.
  isRead: boolean;
  createdAt: string;       // ISO timestamp
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly NOTIF_KEY = 'hospital:notifications:list';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Tạo thông báo mới và lưu vào Redis
   */
  async createNotification(data: Partial<NotificationItem>): Promise<NotificationItem> {
    const list = (await this.redisService.getJson<NotificationItem[]>(this.NOTIF_KEY)) || [];

    const newItem: NotificationItem = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title: data.title || 'Thông báo mới',
      message: data.message || '',
      role: data.role || 'patient',
      targetId: data.targetId || 'ALL',
      email: data.email || undefined,
      phone: data.phone || undefined,
      type: data.type || 'INFO',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newItem);
    // Giữ tối đa 300 thông báo gần nhất
    const trimmedList = list.slice(0, 300);

    await this.redisService.setJson(this.NOTIF_KEY, trimmedList);
    this.logger.log(`🔔 [NotificationService] Đã tạo thông báo mới (${newItem.role}): ${newItem.title}`);
    return newItem;
  }

  /**
   * Lấy danh sách thông báo theo role và thông tin người dùng
   */
  async findAll(query?: {
    role?: string;
    userId?: string;
    doctorId?: string;
    patientId?: string;
    email?: string;
    username?: string;
    phone?: string;
  }): Promise<NotificationItem[]> {
    const list = (await this.redisService.getJson<NotificationItem[]>(this.NOTIF_KEY)) || [];

    // Nếu không có thông báo nào trong hệ thống, trả về danh sách rỗng
    if (list.length === 0) {
      return [];
    }

    if (!query?.role) {
      return list;
    }

    const role = query.role.toLowerCase();
    return list.filter((item) => {
      if (item.role !== role && item.role !== 'admin') {
        return false;
      }

      // Thông báo chung cho role
      if (!item.targetId || item.targetId === 'ALL') {
        return true;
      }

      if (role === 'patient') {
        if (query.patientId && String(item.targetId) === String(query.patientId)) return true;
        if (query.userId && String(item.targetId) === String(query.userId)) return true;
        if (query.email && item.email && item.email.toLowerCase() === query.email.toLowerCase()) return true;
        if (query.phone && item.phone && item.phone === query.phone) return true;
        // Nếu client chỉ truyền role=patient mà không truyền id/email => hiển thị tất cả thông báo patient
        if (!query.patientId && !query.userId && !query.email && !query.phone) return true;
        return false;
      }

      if (role === 'doctor') {
        if (query.doctorId && String(item.targetId) === String(query.doctorId)) return true;
        if (query.userId && String(item.targetId) === String(query.userId)) return true;
        // Nếu client chỉ truyền role=doctor mà không có id cụ thể => hiển thị thông báo doctor
        if (!query.doctorId && !query.userId) return true;
        return false;
      }

      return true;
    });
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(id: string): Promise<NotificationItem | null> {
    const list = (await this.redisService.getJson<NotificationItem[]>(this.NOTIF_KEY)) || [];
    const item = list.find((n) => n.id === id);
    if (!item) return null;

    item.isRead = true;
    await this.redisService.setJson(this.NOTIF_KEY, list);
    return item;
  }

  /**
   * Đánh dấu tất cả thông báo của 1 role/user là đã đọc
   */
  async markAllAsRead(query: {
    role?: string;
    userId?: string;
    doctorId?: string;
    patientId?: string;
    email?: string;
  }): Promise<{ success: boolean; updatedCount: number }> {
    const list = (await this.redisService.getJson<NotificationItem[]>(this.NOTIF_KEY)) || [];
    let count = 0;

    const matchingItems = await this.findAll(query);
    const matchingIds = new Set(matchingItems.map((n) => n.id));

    list.forEach((item) => {
      if (matchingIds.has(item.id) && !item.isRead) {
        item.isRead = true;
        count++;
      }
    });

    await this.redisService.setJson(this.NOTIF_KEY, list);
    return { success: true, updatedCount: count };
  }

  /**
   * Xóa 1 thông báo
   */
  async deleteNotification(id: string): Promise<boolean> {
    const list = (await this.redisService.getJson<NotificationItem[]>(this.NOTIF_KEY)) || [];
    const initialLen = list.length;
    const newList = list.filter((n) => n.id !== id);
    if (newList.length === initialLen) return false;

    await this.redisService.setJson(this.NOTIF_KEY, newList);
    return true;
  }

  /**
   * Xóa toàn bộ thông báo của 1 role
   */
  async clearAll(query: {
    role?: string;
    userId?: string;
    doctorId?: string;
    patientId?: string;
    email?: string;
  }): Promise<{ success: boolean; deletedCount: number }> {
    const list = (await this.redisService.getJson<NotificationItem[]>(this.NOTIF_KEY)) || [];
    const matchingItems = await this.findAll(query);
    const matchingIds = new Set(matchingItems.map((n) => n.id));

    const newList = list.filter((item) => !matchingIds.has(item.id));
    const deletedCount = list.length - newList.length;

    await this.redisService.setJson(this.NOTIF_KEY, newList);
    return { success: true, deletedCount };
  }
}
