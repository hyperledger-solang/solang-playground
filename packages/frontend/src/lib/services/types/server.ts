"use client";

import { OperationOptions as oo } from "@stellar/stellar-base";

export enum Op_Type {
    UP_CT_WASM = 'UploadContractWasm',
    DEP_CT_WASM = 'DeployContractWasm',
    INVOKE_CT_FUNC = "InvokeContractFunction",
}


export type OperationOptionI = oo.UploadContractWasm | oo.CreateCustomContract | ContractInvokeI;


export type Nullable<T> = T | null;

export interface ContractArgumentI { 
    type: string; 
    value: string; 
    subType: string 
}
export interface ContractInvokeI {
    method: string;
    contractId: string;
    args: ContractArgumentI[];
}
