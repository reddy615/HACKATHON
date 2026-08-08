import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardContent, Container, Grid, Typography, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { formatCurrency } from '../utils/formatters';

const initialsFromName = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] || '') + (parts.length > 1 ? (parts[parts.length - 1][0] || '') : '');
};

const ProfilePage = () => {
  const { user } = useAuth();
  const { cart } = useCart();
  const { wishlist, loading: wishlistLoading } = useWishlist();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const stats = useMemo(() => ({
    totalOrders: '--',
    cartItems: cart?.items?.length || 0,
    wishlistItems: wishlist?.length || 0,
  }), [cart, wishlist]);

  if (!user) return null;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 32 }}>{initialsFromName(user.name)}</Avatar>
              <Typography variant="h5">{user.name}</Typography>
              <Typography color="text.secondary">{user.email}</Typography>
              <Typography sx={{ mt: 1 }}><strong>Status:</strong> Active</Typography>
              <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setEditing(true)}>Edit Profile</Button>
              <Button variant="text" href="/" sx={{ mt: 1 }}>Back to Home</Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Account Information</Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography color="text.secondary">Full Name</Typography>
                  <Typography>{user.name || '--'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="text.secondary">Email</Typography>
                  <Typography>{user.email || '--'}</Typography>
                </Grid>
                {user.createdAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Account Created</Typography>
                    <Typography>{new Date(user.createdAt).toLocaleDateString()}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">Total Orders</Typography>
                    <Typography variant="h6">{stats.totalOrders}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">Cart Items</Typography>
                    <Typography variant="h6">{stats.cartItems}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                {/* Wishlist card: uses existing useWishlist() data. No new API or backend changes. */}
                {(() => {
                  const wishlistData = wishlist; // from hook
                  const isArray = Array.isArray(wishlistData);
                  const countDisplay = isArray && !wishlistLoading ? wishlistData.length : '--';

                  // There is a dedicated /wishlist route added to App.jsx — make clickable.
                  const isClickable = true;

                  const cardSx = {
                    borderRadius: 2,
                    boxShadow: 1,
                    transition: 'transform 180ms ease, box-shadow 180ms ease',
                    '&:hover': isClickable ? { transform: 'translateY(-4px) scale(1.01)', boxShadow: 4 } : { boxShadow: 2 },
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                  };

                  const inner = (
                    <Card sx={cardSx} role={isClickable ? 'button' : undefined} aria-label="Wishlist Items">
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 2, bgcolor: 'error.light' }}>
                          <FavoriteIcon sx={{ color: 'error.main' }} />
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Typography color="text.secondary">Wishlist Items</Typography>
                          <Typography variant="h6">{countDisplay}</Typography>
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary">&nbsp;</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  );

                  return isClickable ? (
                    <Tooltip title="View wishlist">
                      <Box onClick={() => navigate('/wishlist')} sx={{ display: 'inline-block' }}>{inner}</Box>
                    </Tooltip>
                  ) : (
                    inner
                  );
                })()}
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>

      <Dialog open={editing} onClose={() => setEditing(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>To update your profile, the application requires a backend profile update API. This UI is a placeholder and will integrate with the API if available.</Typography>
          <TextField fullWidth label="Full Name" defaultValue={user.name} sx={{ mb: 2 }} />
          <TextField fullWidth label="Email" defaultValue={user.email} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(false)}>Cancel</Button>
          <Button disabled variant="contained">Save (Requires API)</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;
