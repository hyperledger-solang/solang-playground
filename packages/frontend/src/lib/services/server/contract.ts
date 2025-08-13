"use client";

import { Account, Address, BASE_FEE, Contract, Keypair, nativeToScVal, Networks, OperationOptions as oo, Operation, scValToNative, TransactionBuilder, xdr } from "@stellar/stellar-base";
import { IParam, } from "../types/common";
import { RpcService } from "../rpc";
import { Api, Server } from "@stellar/stellar-sdk/rpc";
import { matchEnum, safeParseJson, sha256Buffer } from "../utils";
import { ContractArgumentI, ContractInvokeI, Nullable, Op_Type, OperationOptionI } from "../types/server";
import { mapIfValid } from "@/utils";


class ContractService {
    private acc: Account;
    private rpcUrl: string;
    private wasmHash: string;
    private keyPair: Keypair;
    private rpcServer: Server;
    private curTxnHash: string;
    private friendBotUrl: string;
    private nwPassphrase: string;
    private rpcService: RpcService;
    private isSetupDone = false;

    constructor(rpcUrl: string, keyPair: Keypair = Keypair.random()) {
        this.rpcUrl = rpcUrl;
        this.keyPair = keyPair;
        this.rpcService = new RpcService(rpcUrl);
        this.rpcServer = new Server(rpcUrl, {allowHttp: true});

        this.acc = {} as Account;
        this.wasmHash = "";
        this.curTxnHash = "";
        this.friendBotUrl = "";
        this.nwPassphrase = "";
    }

    async setup() {
        const nw = await this.rpcServer.getNetwork();
        this.friendBotUrl = nw.friendbotUrl || "";
        this.nwPassphrase = nw.passphrase;
        this.isSetupDone = true;
    }

    genKeyPairRandom() {
        return Keypair.random();
    }

    async fundAccount(pubKey = this.pubKey()) {
        await this.rpcService.fundAccount(pubKey);
        this.acc = await this.account(pubKey);
    }

    pubKey() {
        return this.keyPair.publicKey();
    }

    async account(pubKey = this.pubKey()) {
        return await this.rpcServer.getAccount(pubKey);
    }
    
    async invokeContract(ciData: ContractInvokeI): Promise<any> {
        if(!this.isSetupDone) {
            await this.setup();
        }
        console.log("Invoking contract:", ciData.contractId, ciData.method, ciData.args);
        await this.fundAccount();
        const op = this.makeOperation(Op_Type.INVOKE_CT_FUNC, ciData);
        const [resp, _] = await this.doTransaction([op]);

        return resp;
    }
    
    // stellar contract upload --wasm <abc.wasm> \
    // --source-account <alice> \
    // --network-passphrase <'Test SDF Network ; September 2015'> \
    // --rpc-url <https://horizon-testnet.stellar.org / https://localhost:8000/rpc>
    async uploadByWasmBuffer(wasm: Buffer): Promise<string> {
        if(!this.isSetupDone) {
            await this.setup();
        }
        this.wasmHash = await sha256Buffer(wasm);
        await this.fundAccount();
        const op = this.makeOperation(Op_Type.UP_CT_WASM, { wasm });
        const [_, addr] = await this.doTransaction([op]);

        return addr;
    }
    
    // stellar contract deploy --wasm-hash <sha256(abc.wasm)> \
    // --source-account <alice> \
    // --network-passphrase <'Test SDF Network ; September 2015'> \
    // --rpc-url <https://horizon-testnet.stellar.org / https://localhost:8000/rpc>
    async deployByWasmHash(ctorParamList: IParam[]) {
        const constructorArgs = ctorParamList.map((param) => nativeToScVal(param.value, { type: param.type }));
        const op = this.makeOperation(Op_Type.DEP_CT_WASM, { 
            wasmHash: Buffer.from(this.wasmHash, "hex"),
            address: Address.fromString(this.pubKey()),
            salt: Buffer.from(this.curTxnHash, "hex"), 
            constructorArgs,
        });

        const [_, addr] = await this.doTransaction([op]);

        return addr;
    }
    
    // 1. upload wasm
    // 2. deploy wasm-hash
    async deployContract(
        wasm: Buffer,
        ctorParamList: IParam[]
    ): Promise<string> {
        await this.uploadByWasmBuffer(wasm);

        const addr = await this.deployByWasmHash(ctorParamList);
        return addr;
    }

    async pollTxnByHash(hash = this.curTxnHash): Promise<any> {
        let rsp;
        let retryTime = 5000;

        while(retryTime > 0) {
            rsp = await this.rpcService.getTransactionByHash(hash);
            if (rsp?.status !== "NOT_FOUND") {
                break;
            }
            retryTime -= 1000;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if(rsp?.status !== "SUCCESS") {
            throw new Error("Transaction failed");
        }

        return rsp;
    }

    async doTransaction(
        ops: xdr.Operation[], 
        acc = this.acc
    ): Promise<[any, string]> {
        const txnBuilder = new TransactionBuilder(acc, {
            fee: BASE_FEE,
            networkPassphrase: this.nwPassphrase,
        });

        for(const op of ops) {
            txnBuilder.addOperation(op);
        }

        const txn = txnBuilder.setTimeout(30).build();
        const preparedTx = await this.rpcServer.prepareTransaction(txn);
        preparedTx.sign(this.keyPair);

        const sim = await this.rpcServer.simulateTransaction(preparedTx) as any;
        const rawReturn = sim.result.retval;
        const addr = scValToNative(rawReturn);
        const stResp = await this.rpcServer.sendTransaction(preparedTx);
        
        this.curTxnHash = stResp.hash;
        
        const resp = await this.pollTxnByHash();
        
        return [resp, addr];
    }

    makeOperation(opType: Op_Type, data: OperationOptionI): xdr.Operation {
        switch(opType) {
            case Op_Type.UP_CT_WASM:
                return Operation.uploadContractWasm(data as oo.UploadContractWasm); 
            
            case Op_Type.DEP_CT_WASM:
                return Operation.createCustomContract(data as oo.CreateCustomContract);
            
            case Op_Type.INVOKE_CT_FUNC:
                return this.buildInvokeOperation(data as ContractInvokeI);
            
            default:
                throw new Error(`Unknown operation type: ${opType}`);
        }
    }

    private buildInvokeOperation(ciData: ContractInvokeI) {
        const mapFn = (val: any, type: string) => {
            try {
                return nativeToScVal(mapIfValid(val, type), { type });
            } catch {
                throw new Error(`Invalid argument "${val}". Expected a valid ${type}`);
            }
        };

        const scArgs = ciData.args.map((arg: ContractArgumentI) => {
            const { value, type, subType } = arg;

            if (type === "vec") {
                const parsed = safeParseJson(value);
                if (parsed === null || !Array.isArray(parsed)) {
                    throw new Error(`Invalid argument "${value}". Expected a JSON array of ${subType}`);
                }
                if (!subType) {
                    throw new Error(`Missing subType for vec argument`);
                }
                return nativeToScVal(parsed.map(v => mapFn(v, subType)), { type });
            }

            return mapFn(value, type);
        });

        const contract = new Contract(ciData.contractId);
        return contract.call(ciData.method, ...scArgs);
    }

}

export default ContractService;