import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "prisma/prisma.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnalyticsService } from "./analytics/analytics.service";
import { AnalyticsController } from "./analytics/analytics.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === "production" ? undefined : "../../.env",
      isGlobal: true,
    }),
    PrismaModule,
    AnalyticsModule,
  ],
  controllers: [AppController, AnalyticsController],
  providers: [AnalyticsService],
})
export class AppModule {}
