import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "prisma/prisma.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnalyticsService } from "./analytics/analytics.service";
import { AnalyticsController } from "./analytics/analytics.controller";

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule, AnalyticsModule],
  controllers: [AppController, AnalyticsController],
  providers: [AppService, AnalyticsService],
})
export class AppModule {}
