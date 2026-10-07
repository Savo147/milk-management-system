"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { formatDate, formatRate } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import EditIcon from "@mui/icons-material/Edit";
import DataCards from "@/components/DataCards";
import RateDialog from "./RateDialog";

export default function RatesTable({ rates }) {
  const [editing, setEditing] = useState(null);

  return (
    <>
      <DataCards
        sx={cardsOnly}
        items={rates}
        getKey={(r) => r.id}
        title={(r) => r.customer_name}
        fields={(r) => [
          ["Rate", `${formatRate(r.rate_per_liter)} / L`],
          ["Since", formatDate(r.effective_from)],
        ]}
        actions={(r) => (
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 17 }} />}
            onClick={() => setEditing(r)}
          >
            Change rate
          </Button>
        )}
        empty="No rates set yet."
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
              <TableCell align="center" sx={{ width: "22%" }}>
                Since
              </TableCell>
              <TableCell align="right" sx={{ width: "10%" }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No rates set yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rates.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.customer_name}
                  </Typography>
                </TableCell>

                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  {formatRate(r.rate_per_liter)}
                </TableCell>

                <TableCell align="center">
                  {formatDate(r.effective_from)}
                </TableCell>

                <TableCell align="right">
                  <Tooltip title="Change rate">
                    <IconButton size="small" onClick={() => setEditing(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
        One row per customer — the rate they pay today, and the day it started.
        Changing it here changes it on the Customers page too. Milk already
        delivered keeps the rate it was billed at.
      </Typography>

      <RateDialog rate={editing} onClose={() => setEditing(null)} />
    </>
  );
}
