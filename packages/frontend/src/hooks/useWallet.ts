"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidSecret } from "@/lib/web3";
import { Keypair } from "@stellar/stellar-sdk";

function useWallet() {
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let s = localStorage.getItem("wallet_secret");
      if (!isValidSecret(s)) {
        s = Keypair.random().secret();
        localStorage.setItem("wallet_secret", s);
      }
      setSecret(s);
    } catch {
      // In case access to localStorage fails (e.g., privacy mode)
      try {
        const s = Keypair.random().secret();
        setSecret(s);
      } catch {}
    }
  }, []);

  const keypair = useMemo<Keypair | undefined>(() => {
    if (!secret) return undefined;
    try {
      return Keypair.fromSecret(secret);
    } catch {
      return undefined;
    }
  }, [secret]);

  return {
    keypair,
    publicKey: keypair ? keypair.publicKey() : "",
  };
}

export default useWallet;
