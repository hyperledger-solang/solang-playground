import { useFileContent } from "@/state/hooks";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import { logger } from "@/state/utils";
import { fetchWithTimeout } from "@/utils";

export interface ICompilationResult {
    data: null | Buffer,
    err: null | string
}

export interface ICompileOptions {
    compilerFlags?: string[];
}

interface ICompilationPayloadBase {
    stdout: string;
    stderr: string;
    compile_stdout: string;
    compile_stderr: string;
}

interface ICompilationSuccessResponse {
    type: "SUCCESS";
    payload: ICompilationPayloadBase & {
        wasm: Buffer;
    };
}

interface ICompilationErrorResponse {
    type: "ERROR";
    payload: ICompilationPayloadBase;
}

type CompilationApiResponse = ICompilationSuccessResponse | ICompilationErrorResponse;

interface CompilationErrorPayload {
    compile_stderr?: unknown;
    compile_stdout?: unknown;
    stderr?: unknown;
    stdout?: unknown;
}

const GENERIC_COMPILER_ERROR = "Compiler failed without diagnostic output";
const GENERIC_BACKEND_ERROR = "Compiler service is unavailable. Please try again.";

/**
 * Extract just the filename from a state path like "explorer.items.src.items['main.sol']"
 */
function extractFilename(statePath: string): string {
    const match = statePath.match(/\['([^']+)'\]$/);
    return match ? match[1] : statePath;
}

/**
 * Build a map of all .sol files in the workspace
 * Returns { filename: content } for all files
 */
function getAllSolFiles(files: Record<string, string>): Record<string, string> {
    const solFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
        if (path.includes('.sol')) {
            const filename = extractFilename(path);
            solFiles[filename] = content;
        }
    }
    return solFiles;
}

function normalizeOutput(output?: string): string {
    return output?.trim() || "";
}

function logCompilerOutput(result: CompilationApiResponse) {
    const compileStdout = normalizeOutput(result.payload.compile_stdout);
    if (compileStdout) {
        logger.info(compileStdout);
    }

    const compileStderr = normalizeOutput(result.payload.compile_stderr);
    if (compileStderr) {
        if (result.type === "SUCCESS") {
            logger.warning(compileStderr);
        } else {
            logger.error(compileStderr);
        }
    }
}

function nonEmptyString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function selectCompilerDiagnostic(payload: CompilationErrorPayload | null | undefined): string {
    return nonEmptyString(payload?.compile_stderr)
        ?? nonEmptyString(payload?.compile_stdout)
        ?? nonEmptyString(payload?.stderr)
        ?? nonEmptyString(payload?.stdout)
        ?? GENERIC_COMPILER_ERROR;
}

async function parseCompileResponse(res: Response) {
    const bodyText = await res.text().catch(() => "");
    const fallbackMessage = bodyText.trim() || res.statusText || `HTTP ${res.status}`;
    let result = null;

    if (bodyText.trim().length > 0) {
        try {
            result = JSON.parse(bodyText);
        } catch {
            result = null;
        }
    }

    if (!result) {
        return {
            success: false,
            message: fallbackMessage,
            result: null,
        };
    }

    return {
        success: res.ok,
        message: res.ok ? res.statusText : fallbackMessage,
        result,
    };
}

function useCompile() {
    const code = useFileContent();
    const selected = useSelector(store, (state) => state.context.currentFile);

    const compileFile = async (targetFilePath?: string, options?: ICompileOptions): Promise<ICompilationResult> => {
        try {
            store.send({ type: "setDialogSpinner", show: true });

            // Determine which file's code to compile
            const state = store.getSnapshot().context;
            const path = targetFilePath || selected || '';
            const codeToCompile = path ? state.files[path] : code;
            const mainFileName = extractFilename(path);

            console.log('[compileFile] path:', path, 'mainFile:', mainFileName);
            if (!codeToCompile) {
                const err = "Error: No Source Code Found"
                logger.error(err);
                return {
                    data: null,
                    err
                }
            }

            // Get all .sol files for import resolution
            const allFiles = getAllSolFiles(state.files);
            console.log('[compileFile] Sending', Object.keys(allFiles).length, 'files for compilation');

            logger.info("Compiling contract...");

            const opts: RequestInit = {
                method: "POST",
                mode: "cors",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source: codeToCompile,
                    main_file: mainFileName,
                    files: allFiles,
                    compiler_flags: options?.compilerFlags || [],
                }),
            };

            const { result, success, message } = await fetchWithTimeout(
                `/compile`,
                opts,
                parseCompileResponse,
            );
            console.log('compilation result', result);

            let err = "";

            if (success) {
                if (result.type === "SUCCESS") {
                    logCompilerOutput(result);
                    const wasm = result.payload.wasm;

                    if (wasm && wasm.length > 0) {
                        // Persist the compiled WASM against the target path (or current selection)
                        store.send({ type: "updateCurrentWasm", path: path, buff: wasm });
                        logger.info("Contract compiled successfully!");
                        return {
                            data: wasm,
                            err: null
                        };
                    }

                    logger.info("Contract compiled successfully (no WASM artifact generated for selected emit mode).");
                    return {
                        data: null,
                        err: null
                    };
                } else {
                    const message = selectCompilerDiagnostic(result.payload);
                    logger.error(message);
                    err = message
                }
            } else {
                const backendMessage = message || GENERIC_BACKEND_ERROR;
                logger.error(backendMessage);
                err = backendMessage
            }
            console.log('[tur] compilation error:', err)
            return {
                data: null,
                err
            }
        } catch {
            logger.error(GENERIC_BACKEND_ERROR);
        }
        finally {
            store.send({ type: "setDialogSpinner", show: false });
        }
        return {
            data: null,
            err: GENERIC_BACKEND_ERROR
        }
    }

    return {
        compileFile
    }

}

export default useCompile;
