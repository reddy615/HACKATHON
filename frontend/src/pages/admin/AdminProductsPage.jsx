import { Container, Paper, Typography } from '@mui/material';

const AdminProductsPage = () => (
  <Container maxWidth="lg" sx={{ py: 6 }}>
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4">Products</Typography>
      <Typography color="text.secondary">Manage catalog items and inventory.</Typography>
    </Paper>
  </Container>
);

export default AdminProductsPage;
