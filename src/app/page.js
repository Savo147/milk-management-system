import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";

export default function Home() {
  return (
    <Box
      component="main"
      className="flex flex-1 flex-col items-center justify-center gap-6 p-8"
    >
      <LocalDrinkIcon color="primary" sx={{ fontSize: 56 }} />
      <Typography variant="h4" component="h1" fontWeight={700}>
        Savo Milk Management System
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Next.js + Tailwind + MUI setup complete.
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained">Admin Panel</Button>
        <Button variant="outlined">Customer Panel</Button>
      </Stack>
    </Box>
  );
}
