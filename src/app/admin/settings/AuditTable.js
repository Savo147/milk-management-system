"use client";

import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { formatDate } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";

export default function AuditTable({ logs }) {
  return (
    <>
      <DataCards
        sx={cardsOnly}
        items={logs}
        getKey={(l) => l.id}
        title={(l) => l.user_name}
        subtitle={(l) => formatDate(l.created_at)}
        badge={(l) => <Chip size="small" label={l.action} variant="outlined" />}
        fields={(l) => [["Where", l.module]]}
        empty="No records yet."
      />

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: "18%" }}>
                Date
              </TableCell>
              <TableCell sx={{ width: "22%" }}>Who</TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                What was done
              </TableCell>
              <TableCell>Where</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No records yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {logs.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell align="center">{formatDate(l.created_at)}</TableCell>
                <TableCell>{l.user_name}</TableCell>
                <TableCell align="center">
                  <Chip size="small" label={l.action} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {l.module}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        sx={{ mt: 1.5, display: "block", color: "text.secondary" }}
      >
        The last 100 records. Audit logs are read-only — there is no way to edit
        or delete them, which is the whole point.
      </Typography>
    </>
  );
}
