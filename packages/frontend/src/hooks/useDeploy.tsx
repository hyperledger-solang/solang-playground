
import { EditorContext } from "@/context/EditorProvider";
import { useFileContent } from "@/state/hooks";
import { useSelector } from "@xstate/store/react";
import { useContext } from "react";
import { store } from "@/state";
import { logger } from "@/state/utils";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import generateIdl from "@/lib/idl-wasm";
import deployStellerContract from "@/lib/deploy-steller";
import { FunctionSpec } from "@/types/idl";


function useDeploy() {


    const deployWasm = async (contract: null | Buffer) => {
        if (!contract) {
            return;
          }
          try {
              const keypair = Keypair.random();
          
              logger.info("Deploying contract...");
              const idl = await generateIdl(contract);
              const fltrd = idl.filter((i: FunctionSpec) => i.name.indexOf('constructor') == -1);
              store.send({ type: "updateContract", methods: fltrd });
              const contractAddress = await deployStellerContract(contract, keypair, Networks.TESTNET);
              logger.info("Contract deployed successfully!");
              contractAddress && store.send({ type: "updateContract", address: contractAddress });

          } catch {
            return !1
          }
          return !0
    }

    return {
        deployWasm
    }
}

export default useDeploy;