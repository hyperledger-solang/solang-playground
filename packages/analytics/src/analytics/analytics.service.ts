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

  async getSummaryStats() {
    const [users, transactions, deploys, invokes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { type: "DEPLOY" } }),
      this.prisma.transaction.count({ where: { type: "INVOKE" } }),
    ]);

    return {
      users,
      transactions,
      deploys,
      invokes,
    };
  }

  async getRecentActivity() {
    const transactions = await this.prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        contract: true,
      },
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      wallet: transaction.user?.wallet,
      contract: transaction.contract?.address,
      action: transaction.type,
      hash: transaction.hash,
      timestamp: transaction.createdAt.toISOString(),
    }));
  }

  async getActivityOverTime() {
    const results = await this.prisma.$queryRaw<
      { date: string; deployments: number; invocations: number }[]
    >`
    SELECT
      DATE("createdAt") AS date,
      COUNT(*) FILTER (WHERE "type" = 'DEPLOY') AS deployments,
      COUNT(*) FILTER (WHERE "type" = 'INVOKE') AS invocations
    FROM "Transaction"
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") ASC;
  `;

    return results.map((r) => ({
      date: r.date, // e.g. "2025-11-03"
      deployments: Number(r.deployments),
      invocations: Number(r.invocations),
    }));
  }

  async getTransactionDistribution() {
    const results = await this.prisma.transaction.groupBy({
      by: ["type"],
      _count: {
        _all: true,
      },
    });

    const data = results.map((r) => ({
      name: r.type.charAt(0) + r.type.slice(1).toLowerCase(), // "DEPLOY" → "Deploy"
      value: r._count._all,
    }));

    return data;
  }

  async getInfo() {
    return {
      users: await this.prisma.user.findMany(),
      contracts: await this.prisma.contract.findMany(),
      transactions: await this.prisma.transaction.findMany(),
    };
  }
}
