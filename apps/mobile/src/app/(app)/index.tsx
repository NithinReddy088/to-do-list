import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { Plus, Settings as SettingsIcon } from "lucide-react-native";
import { useTodoStore } from "@/store/todos";
import type { TodoFilter } from "@/types/todo";
import { TodoItem } from "@/features/todos/TodoItem";
import { FilterBar } from "@/features/todos/FilterBar";

export default function TodoList() {
  const router = useRouter();
  const todos = useTodoStore((s) => s.todos);
  const toggleTodo = useTodoStore((s) => s.toggleTodo);
  const sync = useTodoStore((s) => s.sync);
  const [filter, setFilter] = useState<TodoFilter>("all");

  useEffect(() => {
    sync();
  }, [sync]);

  const visible = useMemo(() => {
    const filtered = todos.filter((t) =>
      filter === "all" ? true : filter === "active" ? !t.completed : t.completed,
    );
    return [...filtered].sort((a, b) => {
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [todos, filter]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: "Tasks",
          headerRight: () => (
            <Link href="/(app)/settings" className="px-2">
              <SettingsIcon size={22} color="#1B2533" />
            </Link>
          ),
        }}
      />
      <FilterBar value={filter} onChange={setFilter} />
      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TodoItem todo={item} onToggle={() => toggleTodo(item.id)} onPress={() => router.push(`/modal/todo?id=${item.id}`)} />
        )}
        ListEmptyComponent={<Text className="mt-20 text-center text-muted">No tasks yet. Tap + to add one.</Text>}
      />
      <Pressable
        onPress={() => router.push("/modal/todo")}
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      >
        <Plus size={28} color="white" />
      </Pressable>
    </View>
  );
}
