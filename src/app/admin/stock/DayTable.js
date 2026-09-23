import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { DAILY_ROW_STATUS, STATUS_COLOR } from "@/lib/constants";
import { formatAmount, formatLiters } from "@/lib/format";

/** Who got how much on the selected date. */
export default function DayTable({ rows }) {
  return (
    <TableContainer
      component={Paper}
      sx={{ border: 1, borderColor: "divider" }}
    >
      <Table size="small" sx={{ minWidth: 700 }}>
        <TableHead>
          <TableRow>
            <TableCell>Customer</TableCell>
            <TableCell align="center" sx={{ width: "16%" }}>
              Delivered
            </TableCell>
            <TableCell align="center" sx={{ width: "16%" }}>
              Rate
            </TableCell>
            <TableCell align="center" sx={{ width: "16%" }}>
              Amount
            </TableCell>
            <TableCell align="center" sx={{ width: "16%" }}>
              Status
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  No milk has been recorded for this date. Add entries on the
                  Daily Milk page.
                </Typography>
              </TableCell>
            </TableRow>
          )}

          {rows.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {r.customer_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.customer_mobile}
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                {formatLiters(r.actual_quantity)}
              </TableCell>
              <TableCell align="center">
                {formatAmount(r.rate_per_liter)}
              </TableCell>
              <TableCell align="center">
                {formatAmount(r.total_amount)}
              </TableCell>
              <TableCell align="center">
                <Chip
                  size="small"
                  label={DAILY_ROW_STATUS[r.delivery_status]}
                  color={STATUS_COLOR[r.delivery_status]}
                  variant={
                    r.delivery_status === "missed" ? "outlined" : "filled"
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
