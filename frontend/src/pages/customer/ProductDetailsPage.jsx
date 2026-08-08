import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Favorite, FavoriteBorder, ShoppingCart } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardMedia, CircularProgress, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import api from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../hooks/useWishlist';
import { trackSessionEvent } from '../../services/sessionTracking';
import { formatCurrency } from '../../utils/formatters';

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/products/${id}`);
        const productData = response.data.data.product;
        setProduct(productData);

        trackSessionEvent({
          eventType: 'product_view',
          productId: productData._id,
          page: `/products/${id}`,
          productName: productData.name,
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      setError('');
      await addToCart(product._id, 1);
    } catch (err) {
      setError(err.message === 'Authentication required' ? 'Please log in to add items to your cart.' : err.response?.data?.message || 'Unable to add item to cart.');
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      setError('');
      await toggleWishlist(product._id);
    } catch (err) {
      setError(err.message === 'Authentication required' ? 'Please log in to use wishlist.' : err.response?.data?.message || 'Unable to update wishlist.');
    }
  };

  if (!product) return <Container sx={{ py: 6 }}><Stack alignItems="center"><CircularProgress /></Stack></Container>;

  const isFavorite = wishlist.some((item) => (item._id || item.id) === product._id);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="img"
              height="500"
              image={product.imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'}
              alt={product.name}
              sx={{ objectFit: 'cover' }}
            />
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4">{product.name}</Typography>
              <IconButton onClick={handleWishlistToggle}>
                {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
              </IconButton>
            </Box>

            <Typography color="text.secondary">{product.category}</Typography>
            <Typography variant="h5">{formatCurrency(product.price)}</Typography>
            <Typography>{product.description}</Typography>
            <Typography>In stock: {product.stock}</Typography>

            <Box>
              <Button variant="contained" size="large" startIcon={<ShoppingCart />} onClick={handleAddToCart} disabled={product.stock === 0}>
                Add to Cart
              </Button>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetailsPage;
