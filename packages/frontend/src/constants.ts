const parseRpcUrlList = (raw: string | undefined): string[] =>
  (raw || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const configuredTestnetRpcUrls = [
  ...parseRpcUrlList(process.env.NEXT_PUBLIC_STELLAR_TESTNET_RPC_URLS),
  ...parseRpcUrlList(process.env.NEXT_PUBLIC_STELLAR_TESTNET_RPC_URL),
];

const defaultTestnetRpcUrls = [
  "https://soroban-testnet.stellar.org:443",
  "https://stellar-soroban-testnet-public.nodies.app",
  "https://soroban-rpc.testnet.stellar.gateway.fm",
];

export const TESTNET_RPC_URLS = Array.from(new Set([...configuredTestnetRpcUrls, ...defaultTestnetRpcUrls]));

export const Network_Url = {
    BACKEND_SERVER: 'http://localhost:4444',
    LOCAL: 'http://localhost:8000/rpc',
    PUBLIC: 'https://soroban.stellar.org:443',
    TEST_NET: TESTNET_RPC_URLS[0],
    TEST_NET_FALLBACKS: TESTNET_RPC_URLS,
    FUTURE_NET: 'https://horizon-futurenet.stellar.org:443',
}

export const DefaultTimeout = 10000;

export const DefaultFetchCallback = async (response: any) => response.json();
