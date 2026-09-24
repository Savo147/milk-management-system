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
import { formatAmount, formatDate } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";

export default function RatesTable({ rates }) {
  return (
    <>
      <DataCards
        sx={cardsOnly}
        items={rates}
        getKey={(r) => r.id}
        title={(r) => r.customer_name}
        badge={(r) =>
          r.effective_to ? null : (
            <Chip size="small" label="Current" color="success" />
          )
        }
        fields={(r) => [
          ["Rate", `${formatAmount(r.rate_per_liter)} / L`],
          ["From", formatDate(r.effective_from)],
          ["Until", r.effective_to ? formatDate(r.effective_to) : "Now"],
        ]}
        empty="No rate history yet."
      />

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="center" sx={{ width: "16%" }}>
                Rate
              </TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                From
              </TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                Until
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Current
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No rate history yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rates.map((r) => {
              const current = !r.effective_to;
              return (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.customer_name}
                    </Typography>
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {formatAmount(r.rate_per_liter)}
                  </TableCell>

                  <TableCell align="center">
                    {formatDate(r.effective_from)}
                  </TableCell>

                  <TableCell align="center">
                    {r.effective_to ? (
                      formatDate(r.effective_to)
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    {current && (
                      <Chip size="small" label="Current" color="success" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        sx={{ mt: 1.5, display: "block", color: "text.secondary" }}
      >
        Rates are not changed here — change a customer&rsquo;s rate on the
        Customers page, and the old row closes itself as a new one starts.
      </Typography>
    </>
  );
}
