import { useEffect, useMemo, useState } from 'react';
import { Favorite, FavoriteBorder, Search } from '@mui/icons-material';
import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Rating,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useWishlist } from '../../hooks/useWishlist';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';

const categoryOptions = ['all', 'electronics', 'fashion', 'furniture', 'home', 'beauty'];

const ProductsPage = () => {
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [loading, setLoading] = useState(false);

  const fetchProducts = async (nextFilters = { search, category, sort }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextFilters.search) params.set('search', nextFilters.search);
      if (nextFilters.category && nextFilters.category !== 'all') params.set('category', nextFilters.category);
      if (nextFilters.sort) params.set('sort', nextFilters.sort);

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data?.data?.products || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts({ search, category, sort });
  }, [category, sort]);

  const wishlistSet = useMemo(() => new Set((wishlist || []).map((item) => item._id || item.id)), [wishlist]);

  const handleSearch = (event) => {
    const nextSearch = event.target.value;
    setSearch(nextSearch);
    fetchProducts({ search: nextSearch, category, sort });
  };

  const handleAddToCart = async (productId) => {
    await addToCart(productId, 1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={3} sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>Featured Products</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            value={search}
            onChange={handleSearch}
            placeholder="Search products"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <FormControl sx={{ minWidth: 180 }}>
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categoryOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'all' ? 'All Categories' : option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }}>
            <Select value={sort} onChange={(event) => setSort(event.target.value)}>
              <MenuItem value="featured">Featured</MenuItem>
              <MenuItem value="price_asc">Price: Low to High</MenuItem>
              <MenuItem value="price_desc">Price: High to Low</MenuItem>
              <MenuItem value="name_asc">Name</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {loading ? (
        <Typography>Loading products...</Typography>
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product._id}>
              <Card sx={{ height: '100%' }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="220"
                    image={product.imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'}
                    alt={product.name}
                  />
                  <IconButton
                    onClick={() => toggleWishlist(product._id)}
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)' }}
                  >
                    {wishlistSet.has(product._id) ? <Favorite color="error" /> : <FavoriteBorder />}
                  </IconButton>
                </Box>
                <CardContent>
                  <Stack spacing={1}>
                    <Chip label={product.category} size="small" sx={{ alignSelf: 'flex-start' }} />
                    <Typography variant="h6">{product.name}</Typography>
                    <Rating value={4.5} precision={0.5} readOnly />
                    <Typography variant="h6">{formatCurrency(product.price)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button component={Link} to={`/products/${product._id}`} variant="outlined" sx={{ flex: 1 }}>
                        View Details
                      </Button>
                      <Button variant="contained" sx={{ flex: 1 }} onClick={() => handleAddToCart(product._id)} disabled={product.stock === 0}>
                        Add to Cart
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ProductsPage;
