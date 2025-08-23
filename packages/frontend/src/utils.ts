import { DefaultFetchCallback, DefaultTimeout } from "./constants";
import { FetchOptionsWithTimeoutI } from "./types/common";

export function mapIfValid(v: string, t: string): [any, string] {
  // Normalize type for matching
    type SolType = keyof typeof typeMap;

    const typeMap = {
        uint8: "u32",
        uint16: "u32",
        uint32: "u32",
        uint64: "u64",
        uint128: "u128",
        uint256: "u256",
        int8: "i32",
        int16: "i32",
        int32: "i32",
        int64: "i64",
        int128: "i128",
        int256: "i256",
        bool: "bool",
        address: "address",
        bytes: "bytes",
        bytes1: "bytes",
        bytes2: "bytes",
        bytes3: "bytes",
        bytes4: "bytes",
        bytes5: "bytes",
        bytes6: "bytes",
        bytes7: "bytes",
        bytes8: "bytes",
        bytes9: "bytes",
        bytes10: "bytes",
        bytes11: "bytes",
        bytes12: "bytes",
        bytes13: "bytes",
        bytes14: "bytes",
        bytes15: "bytes",
        bytes16: "bytes",
        bytes17: "bytes",
        bytes18: "bytes",
        bytes19: "bytes",
        bytes20: "bytes",
        bytes21: "bytes",
        bytes22: "bytes",
        bytes23: "bytes",
        bytes24: "bytes",
        bytes25: "bytes",
        bytes26: "bytes",
        bytes27: "bytes",
        bytes28: "bytes",
        bytes29: "bytes",
        bytes30: "bytes",
        bytes31: "bytes",
        bytes32: "bytes",
        string: "string"
    };

    const sorobanTypes = new Set(Object.values(typeMap));

    const type = t.trim().toLowerCase() as SolType;
    const typ = !sorobanTypes.has(type) ? typeMap[type] : type;

    console.log('[tur] type:', type, 'typ:', typ)
    
    const out: [any, string] = [null, typ || ""] // Fallback — no valid mapping
    
    // Boolean mapping
    if (/^bool$/.test(type) && (v === "true" || v === "false")) {
        out[0] = v === "true";
    } else

    // Unsigned integer mapping (uint8, uint16, uint32, uint64, uint128, uint256)
    if (/^(uint(8|16|32|64|128|256)?|u(8|16|32|64|128|256))$/.test(type) && /^[0-9]+$/.test(v)) {
        out[0] = Number(v); // Keep original type (e.g., uint32)
    } else

    // Signed integer mapping (int8, int16, int32, int64, int128, int256)
    if (/^(int(8|16|32|64|128|256)?|i(8|16|32|64|128|256))$/.test(type) && /^-?[0-9]+$/.test(v)) {
        out[0] = Number(v); // Keep original type (e.g., int32)
    } else

    // Address mapping
    if (type === "address" && /^0x[0-9a-f]{40}$/i.test(v)) {
        out[0] = v;
    } else

    // Bytes mapping (bytes, bytes1..bytes32)
    if (/^bytes([1-9]|[12][0-9]|3[0-2])?$/.test(type) && /^0x[0-9a-f]+$/i.test(v)) {
        out[0] = v;
    } else

    // String mapping
    if (type === "string") {
        out[0] = v;
    }
    console.log('mapping:', 'incoming:', type, v, 'outgoing:', ...out);
    
    return out;
}


export async function fetchWithTimeout(
    resource: string, 
    options: FetchOptionsWithTimeoutI, 
    callback = DefaultFetchCallback
) {
    const { timeout = DefaultTimeout } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal  
    }).then(callback);
    clearTimeout(id);

    return response;
}
