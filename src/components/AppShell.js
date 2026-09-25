"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationBell from "@/components/NotificationBell";
import { signOut } from "@/app/login/actions";

const DRAWER_WIDTH = 250;

/**
 * The confirmation dialog's two buttons.
 *
 * Its own component because useFormStatus only reports on a form it sits
 * inside. Signing out is three round trips to Supabase — the session check,
 * the sign-out itself, then the login page loading — and with no sign of that
 * happening the dialog just seems to hang.
 */
function LogoutActions({ onCancel }) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button onClick={onCancel} disabled={pending}>
        No, keep me in
      </Button>
      <Button
        type="submit"
        variant="contained"
        color="error"
        disabled={pending}
        startIcon={
          pending ? (
            <CircularProgress size={15} color="inherit" />
          ) : (
            <LogoutIcon sx={{ fontSize: 17 }} />
          )
        }
      >
        {pending ? "Signing out..." : "Logout"}
      </Button>
    </>
  );
}

function isActive(pathname, href, rootHref) {
  // The section index must match exactly, or it stays lit on every child route.
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({
  navItems,
  rootHref,
  dairyName,
  logoUrl,
  user,
  notifications = [],
  unread = 0,
  children,
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const current = navItems.find((i) => isActive(pathname, i.href, rootHref));

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64, md: 68 } }}>
        <Box
          component="img"
          src={logoUrl ?? "/logo.png"}
          alt={dairyName}
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: "50%",
            // cover, not contain: a logo letterboxed inside a round frame
            // leaves gaps at the sides and stops reading as a circle.
            objectFit: "cover",
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ lineHeight: 1.3 }}>
            {dairyName}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{ color: "text.secondary", letterSpacing: "0.03em" }}
          >
            {user.role === "admin" ? "Admin Panel" : "Customer"}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />

      <Typography
        variant="caption"
        sx={{
          px: 3,
          pt: 2,
          pb: 0.5,
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.68rem",
        }}
      >
        Menu
      </Typography>

      <List sx={{ px: 1.5, pb: 2, flexGrow: 1 }}>
        {navItems.map(({ href, label, icon: Icon }) => (
          <ListItemButton
            key={href}
            component={Link}
            href={href}
            selected={isActive(pathname, href, rootHref)}
            onClick={() => setMobileOpen(false)}
            sx={{ mb: 0.25, py: 0.9 }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={label}
              slotProps={{ primary: { variant: "body2" } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flex: 1 }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 68 } }}>
          <IconButton
            edge="start"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="subtitle1"
            component="h1"
            noWrap
            sx={{ flexGrow: 1, color: "text.secondary" }}
          >
            {current?.label ?? ""}
          </Typography>

          <NotificationBell notifications={notifications} unread={unread} />

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Account"
            sx={{ ml: 0.5 }}
          >
            <Avatar
              src={user.profile_photo ?? undefined}
              sx={{ width: 32, height: 32, bgcolor: "primary.main" }}
            >
              {user.name?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            <Divider />
            {/*
              A plain item, not a <form>. MUI focuses the first item when the
              menu opens; with a submit button sitting inside it, the opening
              click landed on that button and signed you straight out.
            */}
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setConfirmLogout(true);
              }}
              sx={{ gap: 1.5 }}
            >
              <LogoutIcon fontSize="small" />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>

          <Dialog
            open={confirmLogout}
            onClose={() => setConfirmLogout(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Sign out?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                You will need to sign in again to carry on.
              </Typography>
            </DialogContent>
            {/* Both buttons live inside the form so useFormStatus can reach
                them — Cancel has to go dead once logout is under way. */}
            <Box
              component="form"
              action={signOut}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                px: 3,
                pb: 2.5,
              }}
            >
              <LogoutActions onCancel={() => setConfirmLogout(false)} />
            </Box>
          </Dialog>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: "background.default",
          minHeight: "100vh",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 68 } }} />
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
