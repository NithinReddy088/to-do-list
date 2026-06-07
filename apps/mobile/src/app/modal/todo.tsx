import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTodoStore } from "@/store/todos";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/TextField";
import { DateField } from "@/components/forms/DateField";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  dueAt: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function TodoModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const todos = useTodoStore((s) => s.todos);
  const addTodo = useTodoStore((s) => s.addTodo);
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);
  const existing = id ? todos.find((t) => t.id === id) : undefined;
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: existing?.title ?? "",
      notes: existing?.notes ?? "",
      dueAt: existing?.dueAt ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    setSubmitting(true);
    const dueAt = values.dueAt ? new Date(values.dueAt).toISOString() : null;
    if (existing) updateTodo(existing.id, { title: values.title, notes: values.notes ?? null, dueAt });
    else addTodo({ title: values.title, notes: values.notes ?? null, dueAt });
    useTodoStore.getState().sync();
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-6">
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField label="Title" value={field.value} onChangeText={field.onChange} error={errors.title?.message} autoCapitalize="sentences" />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextField label="Notes" value={field.value ?? ""} onChangeText={field.onChange} autoCapitalize="sentences" />
        )}
      />
      <Controller
        control={control}
        name="dueAt"
        render={({ field }) => (
          <DateField
            label="Due date"
            value={field.value ? field.value : null}
            onChange={(iso) => field.onChange(iso ?? "")}
            error={errors.dueAt?.message}
          />
        )}
      />
      <View className="mt-4">
        <Button label={existing ? "Save" : "Add task"} onPress={handleSubmit(onSubmit)} loading={submitting} />
      </View>
      {existing ? (
        <Pressable
          onPress={() => {
            deleteTodo(existing.id);
            useTodoStore.getState().sync();
            router.back();
          }}
          className="mt-4 items-center"
        >
          <Text className="text-danger">Delete task</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
