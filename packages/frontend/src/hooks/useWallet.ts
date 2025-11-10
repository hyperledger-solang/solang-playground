import { isValidSecret } from "@/lib/web3";
import { Keypair } from "@stellar/stellar-sdk";

function useWallet() {
  let secret = localStorage.getItem("wallet_secret");

  if (!isValidSecret(secret)) {
    secret = Keypair.random().secret();
    localStorage.setItem("wallet_secret", secret);
  }

  const keypair = Keypair.fromSecret(secret);

  return { keypair, publicKey: keypair.publicKey() };
}

export default useWallet;
