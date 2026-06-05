import { useState } from "react";
import { View, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { z } from "zod";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/TextField";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return setError("Enter a valid email and an 8+ char password.");
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(app)");
    } catch {
      setError("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="mb-6 text-3xl font-bold text-text">Welcome back</Text>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}
      <Button label="Log in" onPress={onSubmit} loading={loading} />
      <Link href="/(auth)/register" className="mt-4 text-center text-primary">
        Don&apos;t have an account? Sign up
      </Link>
    </View>
  );
}
