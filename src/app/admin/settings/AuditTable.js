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

export default function AuditTable({ logs }) {
  return (
    <>
      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: "18%" }}>
                Tarikh
              </TableCell>
              <TableCell sx={{ width: "22%" }}>Kone</TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                Shu karyu
              </TableCell>
              <TableCell>Kya</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Hju koi nondh nathi.
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
        Chhelli 100 nondh. Audit logs fakt vanchi shakay chhe — badalvani ke
        kadhvani koi rite nathi, e j to eno matlab chhe.
      </Typography>
    </>
  );
}
