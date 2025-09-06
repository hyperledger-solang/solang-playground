// "use client";

// import ContractServiceServer from "../server/contract";
// import { IParam } from "../types/common";

// export function createContractServiceClient(rpcUrl: string) {
//     const contractServiceServer = ContractServiceServer(rpcUrl);

//     return {
//         async deployContract(wasm: Buffer, ctorParamList: IParam[]): Promise<string> {
//             return await contractServiceServer.deployContract(wasm, ctorParamList);
//         }
//     };
// }

// export default createContractServiceClient;
