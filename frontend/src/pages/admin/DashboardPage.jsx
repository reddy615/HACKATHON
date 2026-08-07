import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Grid, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const DashboardPage = () => {
  const [summary, setSummary] = useState({
    latestModel: null,
    evaluation: {},
    history: [],
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [modelResponse, historyResponse] = await Promise.all([
          api.get('/ai/models/latest'),
          api.get('/ai/history'),
        ]);
        setSummary({
          latestModel: modelResponse.data?.data?.model || null,
          evaluation: modelResponse.data?.data?.model?.metrics || {},
          history: historyResponse.data?.data?.history || [],
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchSummary();
  }, []);

  const stats = [
    { label: 'Latest Model', value: summary.latestModel?.modelName || 'N/A' },
    { label: 'Model Version', value: summary.latestModel?.version || 'N/A' },
    { label: 'Training Records', value: summary.latestModel?.trainingRecordCount ?? 'Not available' },
    { label: 'Test Records', value: summary.latestModel?.testRecordCount ?? 'Not available' },
    { label: 'Accuracy', value: summary.evaluation?.accuracy != null ? `${(summary.evaluation.accuracy * 100).toFixed(1)}%` : 'Not available' },
    { label: 'F1 Score', value: summary.evaluation?.f1Score != null ? `${(summary.evaluation.f1Score * 100).toFixed(1)}%` : 'Not available' },
    { label: 'ROC-AUC', value: summary.evaluation?.rocAuc != null ? `${(summary.evaluation.rocAuc * 100).toFixed(1)}%` : 'Not available' },
    { label: 'Predictions', value: summary.history.length.toString() },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      <Grid container spacing={3}>
        {stats.map((item) => (
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
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Overview</Typography>
            <Typography color="text.secondary">Real-time cart recovery analytics and prediction summaries.</Typography>
            <Box mt={2} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button component={Link} to="/admin/ai-datasets" variant="contained">
                Open AI Dataset Dashboard
              </Button>
              <Button component={Link} to="/admin/predictions" variant="outlined">
                Open Prediction Dashboard
              </Button>
              <Button component={Link} to="/admin/interventions" variant="outlined">
                Open Intervention Analytics
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default DashboardPage;
