import { Text, View, Pressable } from "react-native";
import { Stack } from "expo-router";
import { useUpdates } from "@/features/updates/useUpdates";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";

export default function Settings() {
  const { checking, status, check, currentUpdateId, runtimeVersion, isEmbeddedLaunch } = useUpdates();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Stack.Screen options={{ title: "Settings" }} />
      <Text className="mb-1 text-sm text-muted">Signed in as</Text>
      <Text className="mb-6 text-base text-text">{user?.email ?? "—"}</Text>

      <Text className="mb-1 text-sm text-muted">Runtime version</Text>
      <Text className="mb-3 text-base text-text">{runtimeVersion ?? "—"}</Text>
      <Text className="mb-1 text-sm text-muted">Current update</Text>
      <Text className="mb-6 text-base text-text">{isEmbeddedLaunch ? "Embedded (built-in)" : currentUpdateId ?? "—"}</Text>

      <Button label={checking ? "Checking…" : "Check for updates"} onPress={check} loading={checking} />
      {status ? <Text className="mt-3 text-center text-sm text-muted">{status}</Text> : null}

      <Pressable onPress={logout} className="mt-10 items-center">
        <Text className="text-danger">Log out</Text>
      </Pressable>
    </View>
  );
}
