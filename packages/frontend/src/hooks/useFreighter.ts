import { isConnected, getAddress, signAuthEntry, signTransaction, setAllowed, isAllowed } from "@stellar/freighter-api";
import { useEffect, useState } from "react";

function useFreighter() {
  const [state, setState] = useState({
    connected: false,
    address: null as string | null,
    allowed: false,
  });

  useEffect(() => {
    (async () => {
      const connected = await isConnected()!;
      const address = connected ? await getAddress() : null;
      const allowed = await isAllowed();
      setState({
        connected: connected.isConnected,
        address: address?.address as any,
        allowed: allowed.isAllowed,
      });
    })();
  }, []);

  async function connect() {
    const allowed = await isAllowed();

    if (!allowed) {
      await setAllowed();
    }

    const connected = await isConnected()!;
    const address = connected ? await getAddress() : null;
    setState({
      connected: connected.isConnected,
      address: address?.address as any,
      allowed: true,
    });
  }

  return {
    connected: state.connected,
    address: state.address,
    allowed: state.allowed,
    signAuthEntry,
    signTransaction,
    connect,
  };
}

export default useFreighter;
