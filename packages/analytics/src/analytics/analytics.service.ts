import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "prisma/prisma.service";
import { RecordDeployDto, RecordInvokeDto } from "./analytics.dto";

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

  async recordInvoke({ wallet, address, method, txHash }: RecordInvokeDto) {
    const user = await this.prisma.user.upsert({
      where: { wallet: wallet },
      update: {},
      create: { wallet: wallet },
    });
    const contract = await this.prisma.contract.upsert({
      where: { address: address },
      update: {},
      create: { address: address, deployedById: user.id },
    });
    const transaction = await this.prisma.transaction.create({
      data: {
        type: TransactionType.INVOKE,
        hash: txHash,
        method,
        userId: user.id,
        contractId: contract.id,
      },
    });

    return transaction;
  }

  async getInfo() {
    return {
      users: await this.prisma.user.findMany(),
      contracts: await this.prisma.contract.findMany(),
      transactions: await this.prisma.transaction.findMany(),
    };
  }
}
