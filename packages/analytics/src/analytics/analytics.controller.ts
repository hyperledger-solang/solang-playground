import { Controller, Post, Body, Get } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { RecordDeployDto, RecordInvokeDto } from "./analytics.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("deploy")
  async recordDeployment(@Body() body: RecordDeployDto) {
    const { wallet, address, name, txHash } = body;
    return this.analyticsService.recordDeployment({
      wallet,
      address,
      name,
      txHash,
    });
  }

  @Post("invoke")
  async recordInvoke(@Body() body: RecordInvokeDto) {
    const { wallet, address, method, txHash } = body;
    return this.analyticsService.recordInvoke({
      wallet,
      address,
      method,
      txHash,
    });
  }

  @Get("summary")
  async getSummaryStats() {
    return this.analyticsService.getSummaryStats();
  }

  @Get("recent")
  async getRecentActivity() {
    return this.analyticsService.getRecentActivity();
  }

  @Get("activity-over-time")
  async getActivityOverTime() {
    return this.analyticsService.getActivityOverTime();
  }

  @Get("transaction-distribution")
  async getTransactionDistribution() {
    return this.analyticsService.getTransactionDistribution();
  }

  @Get("info")
  async getInfo() {
    return this.analyticsService.getInfo();
  }
}
