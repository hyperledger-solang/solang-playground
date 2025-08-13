import { useFileContent } from "@/state/hooks";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import { logger } from "@/state/utils";

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
    
        const { result, success, message } = await fetch("http://localhost:8484/compile", opts).then(async (res) => {
            const result = await res.json().catch(() => null);
            console.log('compilation result', result);
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
        console.log('[tur] compilation error:', err)
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
