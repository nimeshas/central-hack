import { useEffect, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { AppKit, AppKitProvider } from "@reown/appkit-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAppKit } from "@/lib/appkit";

export const unstable_settings = {
  anchor: "(tabs)",
};

const devPrivateKey = process.env.EXPO_PUBLIC_DEV_WALLET_PRIVATE_KEY;

/**
 * One-time cleanup of stale WalletConnect session data from AsyncStorage.
 *
 * The universal-provider persists namespace config (including rpcMap URLs)
 * under keys prefixed with "wc@2:". If a previous session was created with
 * a malformed RPC URL (e.g. missing the http:// scheme), restoring that
 * session on the next launch will crash inside jsonrpc-http-connection
 * because it validates the URL protocol.
 *
 * A version flag ensures this only runs once. Bump `CLEANUP_VERSION` if
 * you need to force another round of cleanup in the future.
 *
 * This must complete **before** AppKit / UniversalProvider.init() reads
 * from storage, which is why AppKit creation is deferred via getAppKit().
 */
const CLEANUP_VERSION = "1";
const CLEANUP_KEY = `central-hack:wc_cleanup_v`;

async function clearStaleWcSessions(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(CLEANUP_KEY);
    if (done === CLEANUP_VERSION) {
      return; // Already cleaned up for this version — nothing to do.
    }

    const allKeys = await AsyncStorage.getAllKeys();
    const wcKeys = allKeys.filter((k: string) => k.includes("wc@2:"));
    if (wcKeys.length > 0) {
      await AsyncStorage.multiRemove(wcKeys);
      console.log(
        `[WC cleanup] Cleared ${wcKeys.length} stale WalletConnect key(s)`,
      );
    }

    await AsyncStorage.setItem(CLEANUP_KEY, CLEANUP_VERSION);
  } catch (error) {
    console.warn("[WC cleanup] Failed to clear stale session data:", error);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDevWallet = Boolean(devPrivateKey);
  const [appKit, setAppKit] = useState<ReturnType<typeof getAppKit> | null>(
    null,
  );

  useEffect(() => {
    if (isDevWallet) {
      return;
    }
    let cancelled = false;

    (async () => {
      // Ensure stale WC data is removed before the universal-provider
      // attempts to restore a cached session with a potentially broken
      // rpcMap URL.
      await clearStaleWcSessions();

      if (!cancelled) {
        // Now it is safe to create the AppKit instance; the underlying
        // UniversalProvider.init() will find a clean storage.
        setAppKit(getAppKit());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDevWallet]);

  const content = (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dev-tools" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  if (isDevWallet) {
    return content;
  }

  // Show nothing (or a splash) while we wait for the cleanup + init.
  if (!appKit) {
    return null;
  }

  return (
    <AppKitProvider instance={appKit}>
      {content}
      <AppKit />
    </AppKitProvider>
  );
}
