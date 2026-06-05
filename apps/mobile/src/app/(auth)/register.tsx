import { useState } from "react";
import { View, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { z } from "zod";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/TextField";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export default function Register() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
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
      await register(email, password);
      router.replace("/(app)");
    } catch {
      setError("Could not register. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="mb-6 text-3xl font-bold text-text">Create account</Text>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}
      <Button label="Sign up" onPress={onSubmit} loading={loading} />
      <Link href="/(auth)/login" className="mt-4 text-center text-primary">
        Already have an account? Log in
      </Link>
    </View>
  );
}
