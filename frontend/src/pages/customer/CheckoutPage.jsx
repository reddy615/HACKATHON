import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { trackSessionEvent } from '../../services/sessionTracking';
import { formatCurrency } from '../../utils/formatters';

const paymentOptions = ['card', 'paypal', 'wallet'];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { cart, clearCart, loading: cartLoading } = useCart();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    address: '',
    paymentMethod: 'card',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && !user) {
    navigate('/login', { state: { from: { pathname: '/checkout' } }, replace: true });
  }

  const subtotal = Number(cart?.subtotal || 0);
  const shipping = subtotal > 0 ? 12.0 : 0;
  const total = subtotal + shipping;

  useEffect(() => {
    if (user) {
      trackSessionEvent({
        eventType: 'checkout_step',
        step: 'visit_checkout',
        status: 'started',
      });
    }
  }, [user]);

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }

    try {
      setError('');
      setSuccess('');

      if (!form.fullName || !form.email || !form.address) {
        setError('Please complete all checkout details.');
        return;
      }

      if (!cart?.items?.length) {
        setError('Your cart is empty. Add products before checking out.');
        return;
      }

      setSubmitting(true);
      trackSessionEvent({
        eventType: 'checkout_step',
        step: 'payment_submit',
        status: 'processing',
      });

      const response = await api.post('/orders', {
        paymentMethod: form.paymentMethod,
      });

      if (response.data?.success) {
        setSuccess('Payment simulated successfully. Your order has been placed.');
        trackSessionEvent({
          eventType: 'payment_attempt',
          paymentMethod: form.paymentMethod,
          status: 'success',
          amount: total,
        });
        trackSessionEvent({
          eventType: 'checkout_step',
          step: 'order_confirmed',
          status: 'completed',
        });
        await clearCart();
        setTimeout(() => navigate('/products'), 1200);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Unable to place order.';
      trackSessionEvent({
        eventType: 'payment_attempt',
        paymentMethod: form.paymentMethod,
        status: 'failed',
        amount: total,
        error: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate(-1)}
          sx={{
            mb: 2,
            borderRadius: 2,
            textTransform: 'none',
            px: 2,
            py: 0.5,
            alignSelf: 'flex-start',
            '&:hover': { boxShadow: 1 },
          }}
        >
          ← Back
        </Button>

        <Typography variant="h4" gutterBottom>Checkout</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {(authLoading || cartLoading) && (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress />
          </Stack>
        )}

        {!authLoading && user && (
          <Stack spacing={2}>
            <TextField label="Full Name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} fullWidth />
            <TextField label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} fullWidth />
            <TextField
              select
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
              fullWidth
            >
              {paymentOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>Order Summary</Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Subtotal</Typography>
                  <Typography>{formatCurrency(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Shipping</Typography>
                  <Typography>{formatCurrency(shipping)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700}>Total</Typography>
                  <Typography fontWeight={700}>{formatCurrency(total)}</Typography>
                </Box>
              </Stack>
            </Box>

            <Button variant="contained" size="large" onClick={handlePlaceOrder} disabled={!cart?.items?.length || submitting}>
              {submitting ? 'Processing...' : 'Place Order'}
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
};

export default CheckoutPage;
