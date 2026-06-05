import "../../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { checkAndApplyUpdate } from "@/features/updates/useUpdates";

export default function RootLayout() {
  useEffect(() => {
    // Pull the latest JS bundle from our self-hosted server on cold start.
    // reload:false so we don't yank the UI out from under a returning user;
    // the fetched update applies on the next natural app launch.
    checkAndApplyUpdate({ reload: false }).catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="modal/todo" options={{ presentation: "modal", headerShown: true, title: "Task" }} />
      </Stack>
    </>
  );
}
