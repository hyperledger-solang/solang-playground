
export interface IParam {
    seq: number;
    value: any;
    type: string;
}

interface RpcResponse {
    jsonrpc: string;
    id: number;
    result: {
        status: string;
    };
}

