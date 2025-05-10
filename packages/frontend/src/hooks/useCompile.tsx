import { EditorContext } from "@/context/EditorProvider";
import { useFileContent } from "@/state/hooks";
import { useSelector } from "@xstate/store/react";
import { useContext } from "react";
import { store } from "@/state";
import { logger } from "@/state/utils";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import generateIdl from "@/lib/idl-wasm";
import deployStellerContract from "@/lib/deploy-steller";

export interface ICompilationResult {
    data: null | Buffer,
    err: null | string
}

function useCompile() {
    const code = useFileContent();
    const selected = useSelector(store, (state) => state.context.currentFile);

    const compileFile = async (): Promise<ICompilationResult> => {
        console.log('[tur] [compileFile] code:', code)
        if (!code) {
            const err  ="Error: No Source Code Found"
            logger.error(err);
            return  {
                data: null,
                err
            }
        }
    
        logger.info("Compiling contract...");
    
        const opts: RequestInit = {
            method: "POST",
            mode: "cors",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            source: code,
            }),
        };
    
        const { result, success, message } = await fetch("/compile", opts).then(async (res) => {
            console.log(res);
            console.log(store);
            const result = await res.json().catch(() => null);
    
            if (!result) {
            return {
                success: false,
                message: res.statusText,
                result: null,
            };
            }
    
            return {
            success: res.ok,
            message: res.statusText,
            result: result,
            };
        });

        let err = "";

        if (success) {
            if (result.type === "SUCCESS") {
            const wasm = result.payload.wasm;
            store.send({ type: "updateCurrentWasm", path: selected || '', buff: wasm });
            logger.info("Contract compiled successfully!");
            return {
                data: wasm,
                err: null
            };
            } else {
            const message = result.payload.compile_stderr;
            logger.error(message);
            err = message
            }
        } else {
            logger.error(message);
            err = message
        }
        console.log('[tur] compilatiion error:', err)
        return {
            data: null,
            err
        }
    }

    return {
        compileFile
    }

}

export default useCompile;
