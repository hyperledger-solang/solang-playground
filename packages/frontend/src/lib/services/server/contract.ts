"use client";

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  Networks,
  OperationOptions as oo,
  Operation,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-base";
import { IParam } from "../types/common";
import { RpcService } from "../rpc";
import { Api, Server } from "@stellar/stellar-sdk/rpc";
import { matchEnum, safeParseJson, sha256Buffer } from "../utils";
import { ContractArgumentI, ContractInvokeI, Nullable, Op_Type, OperationOptionI } from "../types/server";
import { mapIfValid } from "@/utils";
import generateIdl from "../../idl-wasm";
import type { IDL, FunctionSpec } from "@/types/idl";

class ContractService {
  private acc: Account;
  private rpcUrl: string;
  private rpcUrls: string[];
  private wasmHash: string;
  private keyPair: Keypair;
  private rpcServer: Server;
  private curTxnHash: string;
  private friendBotUrl: string;
  private nwPassphrase: string;
  private rpcService: RpcService;
  private isSetupDone = false;

  constructor(rpcUrl: string | string[], keyPair: Keypair = Keypair.random()) {
    this.rpcUrls = Array.isArray(rpcUrl) ? rpcUrl.filter(Boolean) : [rpcUrl];
    this.rpcUrl = this.rpcUrls[0] || "";
    if (!this.rpcUrl) {
      throw new Error("At least one RPC URL must be provided");
    }
    this.keyPair = keyPair;
    this.rpcService = new RpcService(this.rpcUrl);
    this.rpcServer = new Server(this.rpcUrl, { allowHttp: true });

    this.acc = {} as Account;
    this.wasmHash = "";
    this.curTxnHash = "";
    this.friendBotUrl = "";
    this.nwPassphrase = "";
  }

  private useRpcUrl(url: string) {
    this.rpcUrl = url;
    this.rpcService = new RpcService(url);
    this.rpcServer = new Server(url, { allowHttp: true });
  }

  async setup() {
    let lastError: unknown = null;

    for (const url of this.rpcUrls) {
      try {
        this.useRpcUrl(url);
        const nw = await this.rpcServer.getNetwork();
        this.friendBotUrl = nw.friendbotUrl || "";
        this.nwPassphrase = nw.passphrase;
        this.isSetupDone = true;
        return;
      } catch (error) {
        lastError = error;
        console.warn(`[ContractService] RPC setup failed for ${url}`, error);
      }
    }

    const errMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Unable to connect to testnet RPC. Tried: ${this.rpcUrls.join(", ")}. Last error: ${errMessage}`);
  }

  genKeyPairRandom() {
    return Keypair.random();
  }

  private isAccountNotFoundError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return /account not found|resource missing|not found/i.test(msg);
  }

  private async waitForAccount(pubKey: string, attempts = 8, delayMs = 750): Promise<Account | null> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.account(pubKey);
      } catch (error) {
        if (!this.isAccountNotFoundError(error)) {
          throw error;
        }
      }
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return null;
  }

  async fundAccount(pubKey = this.pubKey()) {
    const existing = await this.waitForAccount(pubKey, 2, 250);
    if (existing) {
      this.acc = existing;
      return;
    }

    const funded = await this.rpcService.fundAccount(pubKey, this.friendBotUrl);
    if (!funded) {
      throw new Error(
        `Unable to fund testnet account ${pubKey}. Friendbot may be unavailable; please retry in a moment.`,
      );
    }

    const account = await this.waitForAccount(pubKey, 12, 1000);
    if (!account) {
      throw new Error(
        `Account ${pubKey} was funded but is not visible on RPC yet. Please retry in a few seconds.`,
      );
    }

    this.acc = account;
  }

  pubKey() {
    return this.keyPair.publicKey();
  }

  async account(pubKey = this.pubKey()) {
    return await this.rpcServer.getAccount(pubKey);
  }

  async invokeContract(ciData: ContractInvokeI): Promise<any> {
    if (!this.isSetupDone) {
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
    if (!this.isSetupDone) {
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
  async deployByWasmHashEncoded(constructorArgs: xdr.ScVal[]) {
    console.log("Deploying contract:", this.wasmHash.length, constructorArgs.length);
    // Soroban requires a 32-byte salt. Generate if not present.
    const saltU8 = this.curTxnHash
      ? Uint8Array.from(Buffer.from(this.curTxnHash, "hex"))
      : crypto.getRandomValues(new Uint8Array(32));

    const op = this.makeOperation(Op_Type.DEP_CT_WASM, {
      wasmHash: Buffer.from(this.wasmHash, "hex"),
      address: Address.fromString(this.pubKey()),
      salt: Buffer.from(saltU8),
      constructorArgs,
    });

    const [_, addr] = await this.doTransaction([op]);

    return addr;
  }

  // 1. upload wasm
  // 2. deploy wasm-hash
  async deployContract(wasm: Buffer, ctorParamList: IParam[]){
    console.log("Starting deployContract with wasm:", wasm.length, "bytes");
    console.log("Constructor params:", ctorParamList);

    // Check what's actually in the constructor params
    if (ctorParamList.length > 0) {
      console.log("First param details:", {
        type: ctorParamList[0].type,
        value: ctorParamList[0].value,
        seq: ctorParamList[0].seq,
      });
    }

    // 1) Upload wasm
    await this.uploadByWasmBuffer(wasm);
    console.log("WASM uploaded successfully");

    // 2) Build constructor args based on IDL of this wasm (robust to presence/absence)
    let encodedCtorArgs: xdr.ScVal[] = [];
    try {
      const idl: IDL = await generateIdl(new Uint8Array(wasm));
      const ctor = Array.isArray(idl) ? idl.find((i: FunctionSpec) => i.name.includes("constructor")) : undefined;

      if (ctor && Array.isArray(ctor.inputs) && ctor.inputs.length > 0) {
        encodedCtorArgs = ctor.inputs.map((input, idx) => {
          const expectedType = input.value.type as string; // e.g., 'u32', 'i64', 'vec', ...

          if (expectedType === "vec") {
            const sub = (input.value as any).element?.type as string;
            const raw = ctorParamList[idx]?.value ?? "[]";
            const parsed = safeParseJson(String(raw));
            if (parsed === null || !Array.isArray(parsed)) {
              throw new Error(`Invalid constructor arg at ${idx}. Expected JSON array of ${sub}`);
            }
            return nativeToScVal(
              parsed.map((v) => {
                const [vv, tt] = mapIfValid(String(v), sub);
                return nativeToScVal(vv, { type: tt });
              }),
              { type: "vec" },
            );
          }

          const userProvided = ctorParamList[idx]?.value ?? "";
          const [val, mapped] = mapIfValid(String(userProvided), expectedType);
          if (val === null || mapped === "") {
            throw new Error(
              `Invalid constructor arg at index ${idx}. Expected ${expectedType}, received "${String(userProvided)}"`,
            );
          }
          return nativeToScVal(val, { type: mapped });
        });
      } else {
        encodedCtorArgs = [];
      }
    } catch (e) {
      console.warn("Failed to derive constructor args from IDL; defaulting to empty.", e);
      encodedCtorArgs = [];
    }

    // 3) Deploy using encoded args (or none if no constructor)
    console.log("Starting deployByWasmHash...");
    const addr = await this.deployByWasmHash(ctorParamList);

    if (!addr) {
      throw new Error("No contract address returned");
    }

    return {
      contractAddress: addr,
      transactionHash: this.curTxnHash,
      walletAddress: this.pubKey(),
    };
  }

  async pollTxnByHash(hash = this.curTxnHash): Promise<any> {
    let rsp;
    let retryTime = 5000;

    while (retryTime > 0) {
      rsp = await this.rpcService.getTransactionByHash(hash);
      if (rsp?.status !== "NOT_FOUND") {
        break;
      }
      retryTime -= 1000;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (rsp?.status !== "SUCCESS") {
      throw new Error("Transaction failed");
    }

    return rsp;
  }

  async doTransaction(ops: xdr.Operation[], acc = this.acc): Promise<[any, string]> {
    const txnBuilder = new TransactionBuilder(acc, {
      fee: BASE_FEE,
      networkPassphrase: this.nwPassphrase,
    });

    for (const op of ops) {
      txnBuilder.addOperation(op);
    }

    const txn = txnBuilder.setTimeout(30).build();
    const preparedTx = await this.rpcServer.prepareTransaction(txn);
    preparedTx.sign(this.keyPair);

    let stResp;
    let addr;
    try {
      const sim = (await this.rpcServer.simulateTransaction(preparedTx)) as any;
      const rawReturn = sim.result.retval;
      addr = scValToNative(rawReturn);
      stResp = await this.rpcServer.sendTransaction(preparedTx);
    } catch (error) {
      console.error("Error in doTransaction:", error);
      throw error;
    }

    this.curTxnHash = stResp.hash;

    const resp = await this.pollTxnByHash();

    return [resp, addr];
  }

  makeOperation(opType: Op_Type, data: OperationOptionI): xdr.Operation {
    switch (opType) {
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
        const [v, t] = mapIfValid(val, type);
        return nativeToScVal(v, { type: t });
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
        return nativeToScVal(
          parsed.map((v) => mapFn(v, subType)),
          { type },
        );
      }

      return mapFn(value, type);
    });

    console.log("[-] scArgs", scArgs);

    const contract = new Contract(ciData.contractId);
    return contract.call(ciData.method, ...scArgs);
  }
}

export default ContractService;
