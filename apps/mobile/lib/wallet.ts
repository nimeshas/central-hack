import { useMemo } from "react";
import { useAccount, useProvider } from "@reown/appkit-react-native";
import { JsonRpcProvider, Wallet, type Signer } from "ethers";

const devPrivateKey = process.env.EXPO_PUBLIC_DEV_WALLET_PRIVATE_KEY;
const rpcUrl = process.env.EXPO_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";

export type WalletMode = "walletconnect" | "dev";

export type WalletContext = {
  mode: WalletMode;
  address?: string;
  isConnected: boolean;
  provider: unknown | null;
  signer: Signer | null;
};

export function useDevWalletContext(): WalletContext {
  const devProvider = useMemo(() => new JsonRpcProvider(rpcUrl), []);
  const devSigner = useMemo(() => {
    if (!devPrivateKey) {
      return null;
    }
    return new Wallet(devPrivateKey, devProvider);
  }, [devProvider]);

  return {
    mode: "dev",
    address: devSigner?.address,
    isConnected: Boolean(devSigner),
    provider: null,
    signer: devSigner,
  };
}

export function useWalletConnectContext(): WalletContext {
  const { address, isConnected } = useAccount();
  const { provider } = useProvider();

  return {
    mode: "walletconnect",
    address,
    isConnected,
    provider,
    signer: null,
  };
}
