import { NextResponse } from "next/server";
import { TESTNET_RPC_URLS } from "@/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RPC_TIMEOUT_MS = 6000;

async function isRpcHealthy(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "network-health-check",
        method: "getHealth",
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);
    return Boolean(payload && !payload.error);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  for (const url of TESTNET_RPC_URLS) {
    const healthy = await isRpcHealthy(url);
    if (healthy) {
      return NextResponse.json({
        status: "online",
        network: "testnet",
        rpcUrl: url,
        checkedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json(
    {
      status: "offline",
      network: "testnet",
      rpcUrl: null,
      checkedAt: new Date().toISOString(),
    },
    { status: 503 },
  );
}
