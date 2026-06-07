import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: Props) {
  const isPassword = !!secureTextEntry;
  const [hidden, setHidden] = useState(true);

  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-muted">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          className={`h-12 rounded-xl border border-border px-3 text-base text-text ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            className="absolute right-3 h-12 justify-center"
          >
            {hidden ? <Eye size={20} color="#697483" /> : <EyeOff size={20} color="#697483" />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
