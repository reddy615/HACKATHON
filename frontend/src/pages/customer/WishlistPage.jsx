import { useMemo } from 'react';
import { Box, Button, Card, CardContent, CardMedia, CircularProgress, Container, Grid, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../../components/common/ProductCard';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatters';

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, loading, toggleWishlist, fetchWishlist } = useWishlist();
  const { addToCart } = useCart();

  const items = useMemo(() => Array.isArray(wishlist) ? wishlist : [], [wishlist]);

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      // Optionally refresh cart elsewhere via existing context
    } catch (err) {
      if (err.message === 'Authentication required') {
        navigate('/login');
      }
    }
  };

  const handleRemove = async (productId) => {
    try {
      await toggleWishlist(productId);
      // toggleWishlist returns updated wishlist; hook updates state
    } catch (err) {
      // swallow errors silently; do not expose raw API error
      console.error('Unable to remove from wishlist', err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack>
          <Typography variant="h4">My Wishlist</Typography>
          <Typography color="text.secondary">{loading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}</Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(-1)}>← Back</Button>
          <Button variant="contained" onClick={() => navigate('/')}>Home</Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6">Your wishlist is empty</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Browse products and add items to your wishlist for later.</Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/products')}>Shop Products</Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {items.map((product) => (
            <ProductCard
              key={product._id || product.id}
              product={product}
              isFavorite={true}
              onToggleWishlist={() => handleRemove(product._id || product.id)}
              onAddToCart={() => handleAddToCart(product._id || product.id)}
            />
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default WishlistPage;
