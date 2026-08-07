import { DeleteOutline } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatters';
import CartRecoveryWidget from './CartRecoveryWidget';

const CartPage = () => {
  const { cart, loading, fetchCart, updateQuantity, removeFromCart } = useCart();
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);

  const handleQuantityChange = async (itemId, nextQuantity) => {
    try {
      setError('');
      await updateQuantity(itemId, Number(nextQuantity));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update cart quantity.');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      setError('');
      await removeFromCart(itemId);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove item.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>Shopping Cart</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <CartRecoveryWidget onRecovery={(info) => console.log('Recovery action selected', info)} />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : items.length === 0 ? (
        <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Typography>Your cart is empty.</Typography>
          <Button component={Link} to="/products" variant="contained" sx={{ mt: 2 }}>
            Continue Shopping
          </Button>
        </Box>
      ) : (
        <>
          <Stack spacing={2}>
            {items.map((item) => (
              <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 2, gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography fontWeight={700}>{item.product?.name || 'Product'}</Typography>
                  <Typography color="text.secondary">{formatCurrency(item.price)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity}
                    onChange={(event) => handleQuantityChange(item._id, event.target.value)}
                    inputProps={{ min: 1, style: { width: 64 } }}
                  />
                  <IconButton onClick={() => handleRemove(item._id)}>
                    <DeleteOutline />
                  </IconButton>
                </Box>

                <Typography fontWeight={700}>{formatCurrency(item.quantity * item.price)}</Typography>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6">Subtotal</Typography>
            <Typography variant="h6">{formatCurrency(subtotal)}</Typography>
          </Box>

          <Button component={Link} to="/checkout" variant="contained" sx={{ mt: 3 }}>
            Proceed to Checkout
          </Button>
        </>
      )}
    </Container>
  );
};

export default CartPage;
