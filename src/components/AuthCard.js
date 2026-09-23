import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

/**
 * The centred card every signed-out screen sits in — login, forgot password,
 * and setting a new one. Shared so the three cannot drift apart.
 */
export default function AuthCard({
  dairyName,
  logoUrl,
  title,
  subtitle,
  children,
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "grey.100",
        minHeight: "100vh",
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4.5 },
          width: "100%",
          maxWidth: 410,
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
          boxShadow:
            "0 1px 2px rgba(21,26,32,.04), 0 8px 24px rgba(21,26,32,.06)",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          {/* Prefer the uploaded logo; fall back to the copy shipped in
              /public so the page still brands correctly before an admin has
              set one (and for signed-out visitors). */}
          <Box
            component="img"
            src={logoUrl ?? "/logo.png"}
            alt={dairyName}
            sx={{ width: 110, height: 110, objectFit: "contain", mx: "auto" }}
          />
          {/* The dairy name is already part of the logo artwork, so printing
              it again underneath just repeats itself. */}
          <Typography
            variant="h6"
            component="h1"
            color="text.primary"
            sx={{ mt: 1.5, fontWeight: 600, letterSpacing: 0.2 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {children}
      </Paper>
    </Box>
  );
}
