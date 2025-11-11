import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "prisma/prisma.service";
import { RecordDeployDto, RecordInvokeDto } from "./analytics.dto";
import { fillMissingTimeUnits } from "src/libs/utils";

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
      ...r,
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
      name: r.type.charAt(0) + r.type.slice(1).toLowerCase(),
      value: r._count._all,
    }));

    return data;
  }

  async getUniqueUsersPerDay() {
    const raw = await this.prisma.$queryRaw<{ date: string; users: number }[]>`
      SELECT
        DATE("createdAt") AS date,
        COUNT(DISTINCT "wallet") AS users
      FROM "User"
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt");
    `;

    const filled = fillMissingTimeUnits(
      raw.map((r) => ({ ...r, users: Number(r.users) })),
      {
        unit: "day",
        range: 30,
        valueKeys: ["users"],
      },
    );

    return filled;
  }

  async getUniqueUsersPerWeek() {
    const raw = await this.prisma.$queryRaw<{ date: string; users: number }[]>`
      SELECT
        date_trunc('week', "createdAt") AS date,
        COUNT(DISTINCT "wallet") AS users
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '90 days'
      GROUP BY date_trunc('week', "createdAt")
      ORDER BY date_trunc('week', "createdAt");
    `;

    const filled = fillMissingTimeUnits(raw, {
      unit: "week",
      range: 8,
      valueKeys: ["users"],
    });

    return filled;
  }

  async getActiveUsersPerDay() {
    const raw = await this.prisma.$queryRaw<{ date: string; users: number }[]>`
      SELECT
        DATE(a."createdAt") AS date,
        COUNT(DISTINCT a."userId") AS users
      FROM (
        SELECT "userId", "createdAt"
        FROM "Activity"
        WHERE "type" = 'COMPILE'
        UNION ALL
        SELECT "userId", "createdAt"
        FROM "Transaction"
        WHERE "type" IN ('DEPLOY', 'INVOKE')
      ) AS a
      WHERE a."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(a."createdAt")
      ORDER BY DATE(a."createdAt");
    `;

    const filled = fillMissingTimeUnits(raw, {
      unit: "day",
      range: 30,
      valueKeys: ["users"],
    });

    return filled;
  }

  async getActiveUsersPerWeek() {
    const raw = await this.prisma.$queryRaw<{ date: string; users: number }[]>`
    SELECT
      date_trunc('week', a."createdAt") AS date,
      COUNT(DISTINCT a."userId") AS users
    FROM (
      SELECT "userId", "createdAt"
      FROM "Activity"
      WHERE "type" = 'COMPILE'
      UNION ALL
      SELECT "userId", "createdAt"
      FROM "Transaction"
      WHERE "type" IN ('DEPLOY', 'INVOKE')
    ) AS a
    WHERE a."createdAt" >= NOW() - INTERVAL '90 days'
    GROUP BY date_trunc('week', a."createdAt")
    ORDER BY date_trunc('week', a."createdAt");
  `;

    const filled = fillMissingTimeUnits(raw, {
      unit: "week",
      range: 8,
      valueKeys: ["users"],
    });

    return filled;
  }

  async getInfo() {
    return {
      users: await this.prisma.user.findMany(),
      contracts: await this.prisma.contract.findMany(),
      transactions: await this.prisma.transaction.findMany(),
    };
  }
}
