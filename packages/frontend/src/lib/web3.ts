import { Keypair, Networks } from "@stellar/stellar-sdk";

// export const networkRpc = {
//   [Networks.TESTNET]: "https://soroban-testnet.stellar.org:443",
//   [Networks.PUBLIC]: "https://soroban.stellar.org:443",
//   [Networks.FUTURENET]: "https://horizon-futurenet.stellar.org:443",
// } as Record<Networks, string>;

export const networkRpc = {
  [Networks.TESTNET]: "http://localhost:8000/rpc",
  [Networks.PUBLIC]: "http://localhost:8000/rpc",
  [Networks.FUTURENET]: "http://localhost:8000/rpc",
} as Record<Networks, string>;

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function isValidSecret(secretKey: string | null | undefined): secretKey is string {
  if (!secretKey) return false;
  try {
    Keypair.fromSecret(secretKey);
    return true;
  } catch (error) {
    return false;
  }
}
