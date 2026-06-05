import { Pressable, Text, View } from "react-native";
import type { TodoFilter } from "@/types/todo";

const FILTERS: TodoFilter[] = ["all", "active", "done"];

interface Props {
  value: TodoFilter;
  onChange: (f: TodoFilter) => void;
}

export function FilterBar({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2 px-4 py-2">
      {FILTERS.map((f) => (
        <Pressable
          key={f}
          onPress={() => onChange(f)}
          className={`rounded-full px-4 py-1.5 ${value === f ? "bg-primary" : "bg-surface"}`}
        >
          <Text className={`text-sm capitalize ${value === f ? "text-white" : "text-muted"}`}>{f}</Text>
        </Pressable>
      ))}
    </View>
  );
}
