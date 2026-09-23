"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import {
  ISSUE_TYPE,
  PROBLEM_STATE,
  STATUS_COLOR,
  problemState,
} from "@/lib/constants";
import { formatDate, formatLiters } from "@/lib/format";
import RangePicker from "@/components/RangePicker";
import NewProblemDialog from "./NewProblemDialog";
import ThreadDialog from "./ThreadDialog";

export default function ProblemsView({
  problems,
  repliesByReport,
  customer,
  today,
  mode,
  from,
  to,
  monthFrom,
  monthTo,
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  const go = (nextMode, a, b) =>
    router.push(`/customer/report-problem?mode=${nextMode}&from=${a}&to=${b}`);

  const rows = useMemo(
    () =>
      statusFilter === "all"
        ? problems
        : problems.filter((p) => problemState(p.status) === statusFilter),
    [problems, statusFilter],
  );

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
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          {Object.entries(PROBLEM_STATE).map(([value, text]) => (
            <MenuItem key={value} value={value}>
              {text}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreating(true)}
        >
          New complaint
        </Button>
      </Stack>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small" sx={{ minWidth: 680 }}>
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}
            >
              <TableCell>What happened</TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                Issue
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Expected / Got
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Date
              </TableCell>
              <TableCell align="center" sx={{ width: "13%" }}>
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
                      ? 'You have not raised any complaints in this period. Click "New complaint".'
                      : "No complaints with this status."}
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
                      {p.message
                        ? p.message.slice(0, 70) +
                          (p.message.length > 70 ? "…" : "")
                        : "—"}
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
          Click a row to see the dairy&rsquo;s reply and add your own.
        </Typography>
      </Box>

      <NewProblemDialog
        open={creating}
        customer={customer}
        today={today}
        onClose={() => setCreating(false)}
      />

      <ThreadDialog
        problem={open}
        replies={open ? (repliesByReport[open.id] ?? []) : []}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
