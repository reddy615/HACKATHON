import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, CircularProgress, Container, Grid, Typography } from '@mui/material';
import api from '../../api/axios';

const InterventionDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/ai/interventions/stats/overview');
        setStats(response.data?.data?.stats || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load intervention analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const summary = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total Interventions', value: stats.totalInterventions },
      { label: 'Recovered', value: stats.recoveredInterventions },
      { label: 'Conversion Rate', value: `${(stats.conversionRate * 100).toFixed(1)}%` },
      { label: 'Recovery Rate', value: `${(stats.recoveryRate * 100).toFixed(1)}%` },
      { label: 'Avg Cart Value', value: `$${stats.averageCartValue.toFixed(2)}` },
      { label: 'Recovered Cart Value', value: `$${stats.recoveredCartValue.toFixed(2)}` },
    ];
  }, [stats]);

  const typeBreakdown = useMemo(() => {
    if (!stats?.interventionTypeCounts) return [];
    return Object.entries(stats.interventionTypeCounts).map(([type, count]) => ({ type, count }));
  }, [stats]);

  const riskBreakdown = useMemo(() => {
    if (!stats?.riskLevelCounts) return [];
    return Object.entries(stats.riskLevelCounts).map(([risk, count]) => ({ risk, count }));
  }, [stats]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Card>
          <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>Intervention Analytics</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {stats ? (
        <Grid container spacing={3}>
          {summary.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.label}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">{item.label}</Typography>
                  <Typography variant="h5" mt={1}>{item.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography color="text.secondary">No intervention analytics available.</Typography>
      )}
    </Container>
  );
};

export default InterventionDashboardPage;
