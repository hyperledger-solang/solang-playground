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

  @Get("info")
  async getInfo() {
    return this.analyticsService.getInfo();
  }
}
