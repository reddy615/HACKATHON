import { Container, Paper, Typography } from '@mui/material';

const NotificationsPage = () => (
  <Container maxWidth="lg" sx={{ py: 6 }}>
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4">Notifications</Typography>
      <Typography color="text.secondary">Email, SMS, WhatsApp, and push notification recovery history.</Typography>
    </Paper>
  </Container>
);

export default NotificationsPage;
