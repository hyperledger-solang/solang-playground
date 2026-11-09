"use client";

import { store } from "@/state";
import generateIdl from "@/lib/idl-wasm";
import { FunctionSpec } from "@/types/idl";
import useCompile from "./useCompile";
import ContractService from "@/lib/services/server/contract";
import { IParam } from "@/lib/services/types/common";
import { Network_Url } from "@/constants";
import { logger } from "@/state/utils";
import { get } from "lodash";
import { FileType } from "@/types/explorer";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import useWallet from "./useWallet";

function useDeploy() {
  const { compileFile } = useCompile();
  const recordDeploy = useMutation({
    mutationFn: async ({ wallet, address, name, txHash }: any) => {
      return await axios.post("/api/analytics/deploy", {
        wallet,
        address,
        name,
        txHash,
      });
    },
    onError: (error) => {
      console.error("Deployment failed:", error);
    },
    onSuccess: () => {
      console.log("Deployment successful!");
    },
  });
  const { keypair } = useWallet();

    const deployWasm = async (wasmBuf: null | Buffer, ctorParamList: IParam[], targetFilePath?: string) => {
        console.log('[tur] deploying', wasmBuf)

        // Use the provided target file path or fall back to current tab
        const context = store.getSnapshot().context;
        const fileToDeploy = targetFilePath || context.currentFile;
        const currWasm = context.currentWasm;
        console.log('[tur] deploying file:', fileToDeploy, 'current tab:', context.currentFile);

        if (currWasm.path && fileToDeploy && currWasm.path === fileToDeploy) {
            wasmBuf = currWasm.buff
        }
        try {
            store.send({ type: "setDialogSpinner", show: true });
            logger.info(`Deploying contract from file: ${fileToDeploy}`);
            const contractService = new ContractService(Network_Url.TEST_NET_FALLBACKS, keypair);

            // If we don't have WASM buffer, compile the target file
            if (!wasmBuf && fileToDeploy && fileToDeploy !== 'explorer') {
                const result = await compileFile(fileToDeploy);
                wasmBuf = result.data;
                if (wasmBuf) {
                    const file = get(store.getSnapshot().context, fileToDeploy) as FileType;
                    const fileName = file?.name ?? fileToDeploy.match(/\['(.+?)'\]$/)?.[1] ?? "Unknown";
                    store.send({ type: "addCompiled", path: fileToDeploy, name: fileName });
                }
            }

            if (!wasmBuf) {
                logger.error("No WASM buffer available for deployment after compilation attempt");
                throw new Error("No WASM buffer available for deployment");
            }

            const idl = await generateIdl(wasmBuf);
            const fltrd = idl.filter((i: FunctionSpec) => i.name.indexOf('constructor') == -1);
            store.send({ type: "updateContract", methods: fltrd });
            const { contractAddress, transactionHash, walletAddress } = await contractService.deployContract(
              wasmBuf,
              ctorParamList,
            );
            recordDeploy.mutate({
              wallet: walletAddress,
              address: contractAddress,
              name: fileToDeploy,
              txHash: transactionHash,
            });
            console.log("Contract deployed successfully!", contractAddress);
            if (contractAddress) {
                // Extract file name from the file object (path format: "explorer.items.src.items['main.sol']")
                let fileName = 'Unknown';
                if (fileToDeploy) {
                    try {
                        const state = store.getSnapshot().context;
                        const fileObj = get(state, fileToDeploy) as FileType;
                        fileName = fileObj?.name || 'Unknown';
                    } catch {
                        // Fallback: extract from path using regex
                        const match = fileToDeploy.match(/\['(.+?)'\]$/);
                        fileName = match ? match[1] : 'Unknown';
                    }
                }
                store.send({ type: "updateContract", address: contractAddress, fileName });
                logger.info(`Contract deployed successfully! Address: ${contractAddress}`);
            } else {
                logger.error("Deployment completed but no address was returned");
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            logger.error(`Deployment failed: ${errorMessage}`);
            console.log('deployment error', e);

            // Throw the error so it can be caught by the caller (DeployContractModal)
            throw e;
        } finally {
            store.send({ type: "setDialogSpinner", show: false });
        }
        return !0
    }

    return {
        deployWasm
    }
}

export default useDeploy;
