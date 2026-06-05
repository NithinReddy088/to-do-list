import { Text, TextInput, View } from "react-native";

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}

export function TextField({ label, value, onChangeText, error, secureTextEntry, keyboardType, autoCapitalize }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        className="h-12 rounded-xl border border-border px-3 text-base text-text"
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
