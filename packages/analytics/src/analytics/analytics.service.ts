import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async recordEvent(type: string, userId?: string, metadata?: object) {
    return this.prisma.analyticsEvent.create({
      data: {
        eventType: type,
        userId,
        metadata,
      },
    });
  }

  async getStats() {
    return this.prisma.analyticsEvent.count();
  }
}
