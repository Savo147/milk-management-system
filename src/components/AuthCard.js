import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

/** The centred card the login screen sits in. */
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
        // 100vh on a phone counts the browser's own address bar, so the page
        // ends up taller than the screen and scrolls for no reason. dvh is
        // the height actually available; vh stays as the fallback for
        // anything that does not know it.
        minHeight: "100vh",
        "@supports (height: 100dvh)": { minHeight: "100dvh" },
      }}
    >
      <Paper
        sx={{
          p: { xs: 2.5, sm: 4.5 },
          width: "100%",
          maxWidth: 410,
          border: 1,
          borderColor: "divider",
          borderRadius: 4,
          boxShadow:
            "0 1px 2px rgba(21,26,32,.04), 0 8px 24px rgba(21,26,32,.06)",
        }}
      >
        <Box sx={{ textAlign: "center", mb: { xs: 2.5, sm: 3 } }}>
          {/* Prefer the uploaded logo; fall back to the copy shipped in
              /public so the page still brands correctly before an admin has
              set one (and for signed-out visitors). */}
          <Box
            component="img"
            src={logoUrl ?? "/logo.png"}
            alt={dairyName}
            sx={{
              width: { xs: 84, sm: 110 },
              height: { xs: 84, sm: 110 },
              mx: "auto",
              display: "block",
              borderRadius: "50%",
              // Matches the round mark in the sidebar, so the app looks the
              // same before and after signing in.
              objectFit: "cover",
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
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
