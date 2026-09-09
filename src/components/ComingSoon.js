import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ConstructionIcon from "@mui/icons-material/Construction";

/** Placeholder for a page that is planned but not built yet. */
export default function ComingSoon({ items }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 4, border: 1, borderColor: "divider", borderRadius: 2 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <ConstructionIcon color="warning" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Aa page hju banavvano baki chhe
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Aa page par aa vastu aavse:
      </Typography>

      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {items.map((item) => (
          <Chip key={item} label={item} size="small" variant="outlined" />
        ))}
      </Stack>
    </Paper>
  );
}
