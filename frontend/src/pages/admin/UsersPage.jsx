import { Container, Paper, Typography } from '@mui/material';

const UsersPage = () => (
  <Container maxWidth="lg" sx={{ py: 6 }}>
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4">Users</Typography>
      <Typography color="text.secondary">Customer segmentation and engagement information.</Typography>
    </Paper>
  </Container>
);

export default UsersPage;
