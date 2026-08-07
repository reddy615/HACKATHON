import { Container, Paper, Typography } from '@mui/material';

const SessionsPage = () => (
  <Container maxWidth="lg" sx={{ py: 6 }}>
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4">Sessions</Typography>
      <Typography color="text.secondary">Session browsing activity and abandonment context.</Typography>
    </Paper>
  </Container>
);

export default SessionsPage;
