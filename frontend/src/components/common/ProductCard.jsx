import { Favorite, FavoriteBorder } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  IconButton,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';

const ProductCard = ({ product, isFavorite, onToggleWishlist, onAddToCart }) => (
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
          onClick={() => onToggleWishlist?.(product._id)}
          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)' }}
        >
          {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
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
            <Button variant="contained" sx={{ flex: 1 }} onClick={() => onAddToCart?.(product._id)} disabled={product.stock === 0}>
              Add to Cart
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  </Grid>
);

export default ProductCard;
