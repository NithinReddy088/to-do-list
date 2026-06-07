import { Pressable, Text, View } from "react-native";
import { Check, Circle } from "lucide-react-native";
import type { Todo } from "@/types/todo";

interface Props {
  todo: Todo;
  onToggle: () => void;
  onPress: () => void;
}

export function TodoItem({ todo, onToggle, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center border-b border-border px-4 py-3">
      <Pressable onPress={onToggle} hitSlop={8} className="mr-3">
        {todo.completed ? <Check size={22} color="#16A34A" /> : <Circle size={22} color="#697483" />}
      </Pressable>
      <View className="flex-1">
        <Text className={`text-base ${todo.completed ? "text-muted line-through" : "text-text"}`}>{todo.title}</Text>
        {todo.dueAt ? (
          <Text className="text-xs text-muted">
            Due{" "}
            {new Date(todo.dueAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
