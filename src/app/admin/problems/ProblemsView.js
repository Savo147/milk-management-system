"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
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
import {
  ISSUE_TYPE,
  PROBLEM_STATE,
  STATUS_COLOR,
  problemState,
} from "@/lib/constants";
import { formatDate, formatLiters } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import RangePicker from "@/components/RangePicker";
import ProblemDialog from "./ProblemDialog";

export default function ProblemsView({
  problems,
  repliesByReport,
  mode,
  from,
  to,
  monthFrom,
  monthTo,
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Defaults to what still needs work; closed ones are just history.
  const [statusFilter, setStatusFilter] = useState("pending");
  const [openId, setOpenId] = useState(null);

  const go = (nextMode, a, b) =>
    router.push(`/admin/problems?mode=${nextMode}&from=${a}&to=${b}`);

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
        (p.message ?? "").toLowerCase().includes(q)
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
        <RangePicker
          mode={mode}
          monthFrom={monthFrom}
          monthTo={monthTo}
          dateFrom={from}
          dateTo={to}
          onChange={go}
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
        subtitle={(p) => p.message || p.customer_mobile}
        badge={(p) => (
          <Chip
            size="small"
            label={PROBLEM_STATE[problemState(p.status)]}
            color={STATUS_COLOR[problemState(p.status)]}
            variant={problemState(p.status) === "done" ? "filled" : "outlined"}
          />
        )}
        fields={(p) => [
          ["Issue", ISSUE_TYPE[p.issue_type] ?? p.issue_type],
          [
            "Expected / Got",
            `${formatLiters(p.expected_quantity)} / ${formatLiters(
              p.received_quantity,
            )}`,
          ],
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
              <TableCell align="center" sx={{ width: "18%" }}>
                Issue
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Expected / Got
              </TableCell>
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
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
                      {p.message
                        ? p.message.slice(0, 60) +
                          (p.message.length > 60 ? "…" : "")
                        : p.customer_mobile}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {ISSUE_TYPE[p.issue_type] ?? p.issue_type}
                  </TableCell>

                  <TableCell align="center">
                    {formatLiters(p.expected_quantity)} /{" "}
                    {formatLiters(p.received_quantity)}
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

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Click a row to open the details, the conversation and the status.
        </Typography>
      </Box>

      <ProblemDialog
        problem={open}
        replies={open ? (repliesByReport[open.id] ?? []) : []}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
