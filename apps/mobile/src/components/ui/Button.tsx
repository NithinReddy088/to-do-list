import { Pressable, Text, ActivityIndicator } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, loading, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-12 items-center justify-center rounded-xl ${disabled || loading ? "bg-primary/50" : "bg-primary"}`}
    >
      {loading ? <ActivityIndicator color="white" /> : <Text className="text-base font-semibold text-white">{label}</Text>}
    </Pressable>
  );
}
