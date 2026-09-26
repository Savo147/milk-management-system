"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import { PROBLEM_STATE, STATUS_COLOR, problemState } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import ProblemDialog from "./ProblemDialog";

export default function ProblemsView({ problems, repliesByReport, date }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Defaults to what still needs work; closed ones are just history.
  const [statusFilter, setStatusFilter] = useState("pending");
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (statusFilter !== "all" && problemState(p.status) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.customer_name.toLowerCase().includes(q) ||
        (p.customer_mobile ?? "").includes(q) ||
        (p.message ?? "").toLowerCase().includes(q) ||
        (p.last_message ?? "").toLowerCase().includes(q)
      );
    });
  }, [problems, query, statusFilter]);

  const open = problems.find((p) => p.id === openId) ?? null;

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <TextField
          type="date"
          label="Date"
          size="small"
          value={date}
          onChange={(e) =>
            router.push(`/admin/problems?date=${e.target.value}`)
          }
          sx={{ minWidth: 180 }}
        />

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer or message"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { sm: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="all">All</MenuItem>
          {Object.entries(PROBLEM_STATE).map(([value, text]) => (
            <MenuItem key={value} value={value}>
              {text}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataCards
        sx={cardsOnly}
        items={rows}
        getKey={(p) => p.id}
        onClick={(p) => setOpenId(p.id)}
        title={(p) => p.customer_name}
        subtitle={(p) => p.customer_mobile}
        badge={(p) => (
          <Chip
            size="small"
            label={PROBLEM_STATE[problemState(p.status)]}
            color={STATUS_COLOR[problemState(p.status)]}
            variant={problemState(p.status) === "done" ? "filled" : "outlined"}
          />
        )}
        fields={(p) => [
          ["Last message", p.last_message || "—"],
          ["Date", formatDate(p.created_at)],
          ["Replies", (repliesByReport[p.id] ?? []).length],
        ]}
        empty={
          problems.length === 0
            ? "No complaints came in during this period."
            : statusFilter === "pending"
              ? "No complaints are outstanding."
              : "Nothing matches this search."
        }
      />

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell sx={{ width: "30%" }}>Last message</TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Date
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ width: "10%" }}>
                Replies
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {problems.length === 0
                      ? "No complaints came in during this period."
                      : statusFilter === "pending"
                        ? "No complaints are outstanding."
                        : "Nothing matches this search."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((p) => {
              const replies = repliesByReport[p.id] ?? [];
              return (
                <TableRow
                  key={p.id}
                  hover
                  onClick={() => setOpenId(p.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.customer_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.customer_mobile}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {p.last_message
                        ? p.last_message.slice(0, 80) +
                          (p.last_message.length > 80 ? "…" : "")
                        : "—"}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {formatDate(p.created_at)}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={PROBLEM_STATE[problemState(p.status)]}
                      color={STATUS_COLOR[problemState(p.status)]}
                      variant={
                        problemState(p.status) === "done"
                          ? "filled"
                          : "outlined"
                      }
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ justifyContent: "center", alignItems: "center" }}
                    >
                      <ChatBubbleOutlineIcon
                        sx={{
                          fontSize: 15,
                          color: replies.length
                            ? "primary.main"
                            : "text.disabled",
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: replies.length
                            ? "text.primary"
                            : "text.disabled",
                        }}
                      >
                        {replies.length}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <ProblemDialog
        problem={open}
        replies={open ? (repliesByReport[open.id] ?? []) : []}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
