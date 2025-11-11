import { Controller, Post, Body, Get } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { RecordDeployDto, RecordInvokeDto, RecordCompileDto } from "./analytics.dto";

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

  @Post("compile")
  async recordCompile(@Body() body: RecordCompileDto) {
    const { wallet } = body;
    return this.analyticsService.recordCompile(wallet);
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

  @Get("unique-users-per-day")
  async getUniqueUsersPerDay() {
    return this.analyticsService.getUniqueUsersPerDay();
  }

  @Get("unique-users-per-week")
  async getUniqueUsersPerWeek() {
    return this.analyticsService.getUniqueUsersPerWeek();
  }

  @Get("active-users-per-day")
  async getActiveUsersPerDay() {
    return this.analyticsService.getActiveUsersPerDay();
  }

  @Get("active-users-per-week")
  async getActiveUsersPerWeek() {
    return this.analyticsService.getActiveUsersPerWeek();
  }

  @Get("info")
  async getInfo() {
    return this.analyticsService.getInfo();
  }
}
