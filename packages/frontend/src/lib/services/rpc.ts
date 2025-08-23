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

    async fundAccount(accountId: string, url: Nullable<string> = null) {
        try {
            console.log('funding account', accountId, url);
            let _url: string;
            if(url) {
                _url = url + '?addr=';
            } else {
                _url = this.url.replace('/rpc', '/friendbot?addr=');
            }
            const r = await fetch(`${_url}${accountId}`)
            if(r.ok) {
                const o = await r.json()
                // console.log('result:', o) 
                return o.successful
            }
        } catch(e) {
            console.error('error funding account', e);
        }

        return false
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