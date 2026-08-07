import { AppBar, Box, Button, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import { Brightness4, Brightness7, ShoppingCart } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ mode, setMode }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

          <Button component={Link} to="/products" color="inherit">
            Products
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

          <Button component={Link} to="/cart" color="inherit" startIcon={<ShoppingCart />}>
            Cart
          </Button>

          {user ? (
            <>
              <Button color="inherit">{user.name}</Button>
              <Button variant="contained" onClick={handleLogout}>
                Logout
              </Button>
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
