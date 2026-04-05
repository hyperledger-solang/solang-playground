"use client";

import { Api } from "@stellar/stellar-sdk/rpc";
import { Nullable } from "./types/server";


export class RpcService {
    url: string;
    method: string;
    params?: object;

    constructor(url: string) {
        this.url = url
        this.method = ""
        this.params = undefined
    }

    async getTransactionByHash(hash: string): Promise<Api.GetTransactionResponse> {
        this.method = "getTransaction"
        this.params = { hash }
        const r: Api.GetTransactionResponse = await this.client()
        return r
    }

    private friendbotRequestUrl(baseUrl: string, accountId: string) {
        const trimmed = baseUrl.trim().replace(/\/+$/, "");
        if (!trimmed) return "";
        if (trimmed.includes("?addr=")) return `${trimmed}${accountId}`;
        if (trimmed.includes("?")) return `${trimmed}&addr=${accountId}`;
        return `${trimmed}?addr=${accountId}`;
    }

    async fundAccount(accountId: string, url: Nullable<string> = null) {
        const rpcDerivedFriendbot = this.url.replace(/\/rpc\/?$/, "/friendbot");
        const candidates = Array.from(
            new Set(
                [url, rpcDerivedFriendbot, "https://friendbot.stellar.org", "https://friendbot-testnet.stellar.org", "https://horizon-testnet.stellar.org/friendbot"]
                    .filter((u): u is string => Boolean(u && u.trim()))
            )
        );

        for (const candidate of candidates) {
            const requestUrl = this.friendbotRequestUrl(candidate, accountId);
            if (!requestUrl) continue;
            try {
                console.log("funding account", accountId, requestUrl);
                const r = await fetch(requestUrl);
                const body = await r.text();
                if (r.ok) {
                    return true;
                }

                // If account already exists on testnet, continue as success.
                if (r.status === 400 && /already|exists|funded/i.test(body)) {
                    return true;
                }
            } catch (e) {
                console.warn("friendbot request failed", candidate, e);
            }
        }

        return false;
    }

    async getAccount(accountId: string) {
        this.method = "getAccount"
        this.params = { accountId }
        return await this.client()
    }

    private async client() {
        let o0 = {
                jsonrpc: "2.0",
                method: this.method,
                id: 1,
            };
        let o1;
        if (this.params) {
            o1 = {...o0, params: this.params}
        }
        const body = JSON.stringify(this.params ? o1 : o0);

        const f = await fetch(this.url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body,
        })

        if(f.ok) {
            const o = await f.json()
            console.log('result:', o) 
            return o.result
        }
        return null
    }
}
