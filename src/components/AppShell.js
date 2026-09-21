"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
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

  const current = navItems.find((i) => isActive(pathname, i.href, rootHref));

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64, md: 68 } }}>
        <Box
          component="img"
          src={logoUrl ?? "/logo.png"}
          alt={dairyName}
          sx={{ width: 38, height: 38, objectFit: "contain", flexShrink: 0 }}
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
            aria-label="Menu kholo"
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
            <MenuItem
              component="form"
              action={signOut}
              sx={{ p: 0 }}
              disableRipple
            >
              <Box
                component="button"
                type="submit"
                sx={{
                  all: "unset",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  width: "100%",
                  px: 2,
                  py: 1,
                  cursor: "pointer",
                }}
              >
                <LogoutIcon fontSize="small" />
                <Typography variant="body2">Logout</Typography>
              </Box>
            </MenuItem>
          </Menu>
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
