import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "prisma/prisma.service";
import { RecordDeployDto } from "./analytics.dto";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async recordDeployment({ wallet, address, name, txHash }: RecordDeployDto) {
    const contract = await this.prisma.contract.create({
      data: {
        address,
        name,
        deployedBy: {
          connectOrCreate: {
            where: { wallet },
            create: { wallet },
          },
        },
      },
    });

    await this.prisma.transaction.create({
      data: {
        type: TransactionType.DEPLOY,
        hash: txHash,
        contractId: contract.id,
        userId: contract.deployedById,
      },
    });

    return contract;
  }

  async getInfo() {
    return {
      users: await this.prisma.user.findMany(),
      contracts: await this.prisma.contract.findMany(),
      transactions: await this.prisma.transaction.findMany(),
    };
  }
}
