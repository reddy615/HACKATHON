import { Container, Paper, Typography } from '@mui/material';

const AnalyticsPage = () => (
  <Container maxWidth="lg" sx={{ py: 6 }}>
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4">Analytics</Typography>
      <Typography color="text.secondary">Cart abandonment funnel, risk trends, and channel performance overview.</Typography>
    </Paper>
  </Container>
);

export default AnalyticsPage;
