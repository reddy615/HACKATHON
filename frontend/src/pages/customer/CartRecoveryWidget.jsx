import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardActions, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getOrCreateSessionId, trackSessionEvent } from '../../services/sessionTracking';

const CartRecoveryWidget = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [intervention, setIntervention] = useState(null);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    const evaluate = async () => {
      try {
        const sessionId = getOrCreateSessionId();
        const response = await api.post('/ai/interventions/evaluate', { sessionId });
        if (response.data?.success) {
          setIntervention(response.data.data.intervention);
        } else {
          setError(response.data?.message || 'No recovery action available.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to fetch recovery recommendations.');
      } finally {
        setLoading(false);
      }
    };

    evaluate();
  }, []);

  const handleApplyRecommendation = async () => {
    if (!user) {
      setActionStatus('Please sign in to apply your cart recovery recommendation.');
      navigate('/login');
      return;
    }

    const sessionId = getOrCreateSessionId();
    const recommendation = intervention?.payload?.productRecommendations?.products?.[0];

    try {
      setActionStatus('Applying recommendation...');
      if (recommendation) {
        await api.post('/carts/items', { productId: recommendation._id, quantity: 1 });
        setActionStatus('Added recommended item to your cart. Continue to checkout to recover your order.');
        await api.put(`/ai/interventions/${intervention._id}/action/accept`, { sessionId });
        trackSessionEvent({ eventType: 'intervention_action', action: 'accept', interventionId: intervention._id, result: 'recommendation_applied' });
        setIntervention(null);
        navigate('/cart');
        return;
      }

      await api.put(`/ai/interventions/${intervention._id}/action/accept`, { sessionId });
      trackSessionEvent({ eventType: 'intervention_action', action: 'accept', interventionId: intervention._id, result: 'checkout_conversion' });
      navigate('/checkout');
    } catch (err) {
      setActionStatus(err.response?.data?.message || 'Failed to apply recommendation.');
    }
  };

  const markInterventionDelivered = async () => {
    if (!intervention?._id) return;
    try {
      const sessionId = getOrCreateSessionId();
      await api.put(`/ai/interventions/${intervention._id}/action/show`, { sessionId });
      trackSessionEvent({ eventType: 'intervention_action', action: 'show', interventionId: intervention._id });
    } catch (err) {
      // best-effort delivered tracking; ignore failures to avoid blocking UI
    }
  };

  useEffect(() => {
    if (intervention?._id) {
      markInterventionDelivered();
    }
  }, [intervention?._id]);

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <Alert severity="info">{error}</Alert>;
  }

  if (!intervention) {
    return <Alert severity="success">Your cart is stable. No recovery action is required right now.</Alert>;
  }

  if (!user) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Cart Recovery Recommendation</Typography>
          <Typography sx={{ mt: 1, mb: 2 }}>Sign in to access cart recovery recommendations and apply them to your account.</Typography>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sessionId = getOrCreateSessionId();
  const recommendation = intervention.payload?.productRecommendations?.products?.[0];
  const hasOffer = intervention.interventionType === 'RECOVERY_OFFER';

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6">Cart Recovery Recommendation</Typography>
        <Chip
          label={intervention.riskLevel}
          color={intervention.riskLevel === 'HIGH' ? 'error' : intervention.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
          sx={{ mt: 1, mb: 2 }}
        />
        <Typography variant="body1" sx={{ mb: 1 }}>{intervention.message || intervention.reason}</Typography>
        {recommendation && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            Recommended item: {recommendation.name} for {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(recommendation.price)}.
          </Typography>
        )}
        {hasOffer && (
          <Typography variant="body2" sx={{ color: 'success.main' }}>
            Special recovery offer available for your cart.
          </Typography>
        )}
        {actionStatus && (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>{actionStatus}</Typography>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={handleApplyRecommendation}>
          Apply Recommendation
        </Button>
        <Button
          size="small"
          color="secondary"
          onClick={async () => {
            try {
              setActionStatus('Dismissing recommendation...');
              await api.put(`/ai/interventions/${intervention._id}/action/dismiss`, { sessionId });
              setActionStatus('Recommendation dismissed.');
              setIntervention(null);
            } catch (err) {
              setActionStatus(err.response?.data?.message || 'Failed to dismiss recommendation.');
            }
          }}
        >
          Dismiss
        </Button>
      </CardActions>
    </Card>
  );
};

export default CartRecoveryWidget;
