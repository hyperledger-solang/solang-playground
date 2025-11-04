import { Controller, Get, Post, Body } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("event")
  recordEvent(@Body() body: any) {
    return this.analyticsService.recordEvent(
      body.type,
      body.userId,
      body.metadata
    );
  }

  @Get("stats")
  getStats() {
    return this.analyticsService.getStats();
  }
}
