import { AppBar, Avatar, Badge, Box, Button, IconButton, Menu, MenuItem, Toolbar, Typography, useTheme, ListItemIcon } from '@mui/material';
import { Brightness4, Brightness7, ShoppingCart, Person, Favorite as FavoriteIcon, Logout } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../hooks/useWishlist';

const Navbar = ({ mode, setMode }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { wishlist, loading: wishlistLoading } = useWishlist();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleProfileClick = (e) => setAnchorEl(e.currentTarget);
  const handleProfileClose = () => setAnchorEl(null);

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography component={Link} to="/" variant="h6" sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 800 }}>
            CartRescue AI
          </Typography>

          <Button component={Link} to="/" color="inherit">
            Home
          </Button>

          <Button component={Link} to="/products" color="inherit">
            Products
          </Button>

          <Button color="inherit" onClick={() => navigate(-1)}>
            ← Back
          </Button>

          {user?.role === 'admin' && (
            <Button component={Link} to="/admin" color="inherit">
              Admin
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <IconButton onClick={() => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))} color="inherit">
            {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
          </IconButton>

          <Button component={Link} to="/wishlist" color="inherit" startIcon={
            <Badge badgeContent={(!wishlistLoading && Array.isArray(wishlist)) ? wishlist.length : 0} color="error" overlap="circular">
              <FavoriteIcon />
            </Badge>
          }>
            Wishlist
          </Button>

          <Button component={Link} to="/cart" color="inherit" startIcon={<ShoppingCart />}>
            Cart
          </Button>

          {user ? (
            <>
              <Button color="inherit" onClick={handleProfileClick} startIcon={<Avatar sx={{ width: 28, height: 28 }}>{(user.name || '').split(' ').map(n=>n[0]).slice(0,2).join('')}</Avatar>}>
                {user.name}
              </Button>
              <Menu anchorEl={anchorEl} open={open} onClose={handleProfileClose} onClick={handleProfileClose} PaperProps={{ sx: { mt: 1, minWidth: 220 } }}>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle1">{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </Box>
                <MenuItem component={Link} to="/profile">
                  <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                  My Profile
                </MenuItem>
                <MenuItem component={Link} to="/wishlist">
                  <ListItemIcon><FavoriteIcon fontSize="small" /></ListItemIcon>
                  My Wishlist
                </MenuItem>
                <MenuItem component={Link} to="/cart">
                  <ListItemIcon><ShoppingCart fontSize="small" /></ListItemIcon>
                  My Cart
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" color="inherit">
                Login
              </Button>
              <Button component={Link} to="/register" variant="contained">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
