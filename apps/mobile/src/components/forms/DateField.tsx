import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar, X } from "lucide-react-native";

interface Props {
  label: string;
  value: string | null; // ISO string (UTC midnight) or null
  onChange: (iso: string | null) => void;
  error?: string;
}

// A due date is date-only, stored as UTC midnight (e.g. 2026-06-13T00:00:00.000Z).
// These helpers convert between that and a local Date for the picker/display so
// the calendar day never shifts due to timezone.
function isoToLocalDate(iso: string): Date {
  const u = new Date(iso);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

function localDateToIso(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DateField({ label, value, onChange, error }: Props) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    // Android closes after a pick/dismiss; iOS keeps the inline picker visible.
    if (Platform.OS !== "ios") setShow(false);
    if (event.type === "set" && selected) {
      onChange(localDateToIso(selected));
    }
  }

  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-muted">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          onPress={() => setShow(true)}
          accessibilityRole="button"
          className="h-12 flex-1 flex-row items-center justify-between rounded-xl border border-border px-3"
        >
          <Text className={`text-base ${value ? "text-text" : "text-muted"}`}>
            {value ? formatDate(value) : "Select a date"}
          </Text>
          <Calendar size={20} color="#697483" />
        </Pressable>
        {value ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear due date"
            className="ml-2 h-12 w-10 items-center justify-center"
          >
            <X size={20} color="#697483" />
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <DateTimePicker
          value={value ? isoToLocalDate(value) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleChange}
        />
      ) : null}
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
