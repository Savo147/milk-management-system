"use client";

import { useRouter } from "next/navigation";
import TextField from "@mui/material/TextField";

export default function DayPicker({ date }) {
  const router = useRouter();
  return (
    <TextField
      type="date"
      label="Date"
      size="small"
      value={date}
      onChange={(e) => router.push(`/admin/stock?date=${e.target.value}`)}
      sx={{ minWidth: 180 }}
    />
  );
}
