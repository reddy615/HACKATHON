import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import api from '../../api/axios';

const formatNumber = (value) => Number(value || 0).toLocaleString();

const AIDatasetDashboardPage = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await api.get('/ai/datasets');
        setDatasets(response.data?.data?.datasets || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dataset history.');
      } finally {
        setLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  const latestDataset = useMemo(() => datasets[0] || null, [datasets]);

  const refreshDatasets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ai/datasets');
      setDatasets(response.data?.data?.datasets || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load dataset history.');
    } finally {
      setLoading(false);
    }
  };

  const generateDataset = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/ai/generate-dataset', { maxSessions: 5000 });
      if (response.data?.success) {
        await refreshDatasets();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to generate dataset.');
    } finally {
      setGenerating(false);
    }
  };

  const exportDataset = async (format) => {
    if (!latestDataset) return;

    try {
      setExporting(true);
      const response = await api.post(
        '/ai/export',
        { datasetId: latestDataset._id, format },
        { responseType: 'blob' }
      );

      if (response.status >= 400) {
        throw new Error('Export failed');
      }

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${latestDataset.datasetVersion || 'dataset'}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to export dataset.');
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: 'Total Sessions', value: latestDataset?.totalSessions ?? 0 },
    { label: 'Processed Sessions', value: latestDataset?.processedSessions ?? 0 },
    { label: 'Purchased Sessions', value: latestDataset?.purchasedSessions ?? 0 },
    { label: 'Abandoned Sessions', value: latestDataset?.abandonedSessions ?? 0 },
  ];

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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">AI Dataset Dashboard</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" disabled={generating} onClick={generateDataset}>
            {generating ? 'Generating…' : 'Generate Dataset'}
          </Button>
          <Button variant="contained" disabled={!latestDataset || exporting} onClick={() => exportDataset('csv')}>
            Export CSV
          </Button>
          <Button variant="outlined" disabled={!latestDataset || exporting} onClick={() => exportDataset('json')}>
            Export JSON
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{item.label}</Typography>
                <Typography variant="h5" mt={1}>{formatNumber(item.value)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Dataset Summary</Typography>
              <Typography><strong>Dataset Version:</strong> {latestDataset?.datasetVersion || 'Not generated yet'}</Typography>
              <Typography><strong>Dataset Size:</strong> {formatNumber(latestDataset?.numberOfRecords || 0)}</Typography>
              <Typography><strong>Generated Date:</strong> {latestDataset?.generatedDate ? new Date(latestDataset.generatedDate).toLocaleString() : 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Dataset History</Typography>
              {datasets.length === 0 ? (
                <Typography color="text.secondary">No datasets generated yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {datasets.slice(0, 5).map((dataset) => (
                    <Paper key={dataset._id} variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2">{dataset.datasetVersion}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {new Date(dataset.generatedDate).toLocaleString()} • {dataset.numberOfRecords} rows
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AIDatasetDashboardPage;
