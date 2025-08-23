"use server";

import { Network_Url } from "@/constants";
import { ActionError } from "@/lib/action-util";
import ContractService from "@/lib/services/server/contract";

export async function callContract({
  contractId,
  method,
  args,
}: {
  method: string;
  contractId: string;
  args: { type: string; value: string; subType: string }[];
}) {
  try {
    const ciData = { contractId, method, args };
    console.log("[callContract] Invoking contract:", ciData);
    const contractService = new ContractService(Network_Url.TEST_NET);
    const result = await contractService.invokeContract(ciData);
    return result;
  } catch (error: any) {
    console.error("[callContract] Error invoking contract", error);
    return ActionError(error?.message || "Error invoking contract");
  }
}
