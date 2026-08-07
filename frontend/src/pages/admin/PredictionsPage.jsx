import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import api from '../../api/axios';

const PredictionsPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/ai/history');
        setHistory(response.data?.data?.history || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load prediction history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const summary = useMemo(() => ({
    total: history.length,
    highRisk: history.filter((item) => item.riskLevel === 'HIGH').length,
    mediumRisk: history.filter((item) => item.riskLevel === 'MEDIUM').length,
    lowRisk: history.filter((item) => item.riskLevel === 'LOW').length,
  }), [history]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>AI Prediction Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Predictions', value: summary.total },
          { label: 'High Risk', value: summary.highRisk },
          { label: 'Medium Risk', value: summary.mediumRisk },
          { label: 'Low Risk', value: summary.lowRisk },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{item.label}</Typography>
                <Typography variant="h5" mt={1}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Prediction History</Typography>
          {history.length === 0 ? (
            <Typography color="text.secondary">No prediction history yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {history.map((item) => (
                <Paper key={item._id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2">{item.prediction}</Typography>
                    <Chip label={item.riskLevel} color={item.riskLevel === 'HIGH' ? 'error' : item.riskLevel === 'MEDIUM' ? 'warning' : 'success'} size="small" />
                  </Box>
                  <Typography color="text.secondary" variant="body2">
                    Probability {(item.probability * 100).toFixed(1)}% • Confidence {item.confidence}% • {new Date(item.timestamp).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default PredictionsPage;
