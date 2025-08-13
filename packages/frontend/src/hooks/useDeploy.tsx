
"use client";

import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import generateIdl from "@/lib/idl-wasm";
import { FunctionSpec } from "@/types/idl";
import useCompile from "./useCompile";
import ContractService from "@/lib/services/server/contract";
import { IParam } from "@/lib/services/types/common";
import { Network_Url } from "@/constants";


function useDeploy() {
    const {compileFile} = useCompile();
    
    const selected = useSelector(store, (state) => state.context.currentFile);
    const currWasm = useSelector(store, (state) => state.context.currentWasm);


    const deployWasm = async (wasmBuf: null | Buffer, ctorParamList: IParam[]) => {
        console.log('[tur] deploying', wasmBuf)
        
        if(currWasm.path.indexOf(selected || '') > -1) {
            wasmBuf = currWasm.buff
        } else if(!wasmBuf && selected && selected !== 'explorer') {
            const r = await compileFile();
            wasmBuf = r.data
        }
        
        if (!wasmBuf) {
            return;
        }
        try {
            const contractService = new ContractService(Network_Url.LOCAL)
        
            const idl = await generateIdl(wasmBuf);
            const fltrd = idl.filter((i: FunctionSpec) => i.name.indexOf('constructor') == -1);
            store.send({ type: "updateContract", methods: fltrd });
            const contractAddress = await contractService.deployContract(wasmBuf, ctorParamList);
            console.log("Contract deployed successfully!", contractAddress);
            if(contractAddress) store.send({ type: "updateContract", address: contractAddress });

        } catch (e) {
            console.log('deployment error', e)
        return !1
        }
        return !0
    }

    return {
        deployWasm
    }
}

export default useDeploy;