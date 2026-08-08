import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const features = [
  'AI-powered abandonment risk detection',
  'Real-time session tracking',
  'Smart recovery recommendations',
  'Multi-channel recovery messaging',
];

const HomePage = () => {
  const { user, loading } = useAuth();

  return (
  <Container maxWidth="lg" sx={{ py: 8 }}>
    <Grid container spacing={4} alignItems="center">
      <Grid item xs={12} md={7}>
        <Stack spacing={3}>
          <Typography variant="h2" fontWeight={800}>
            Reduce cart abandonment before it happens.
          </Typography>
          <Typography variant="h6" color="text.secondary">
            CartRescue AI predicts risk in real time and recommends the right action instead of blanket discounts.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button component={Link} to="/products" variant="contained" size="large">
              Shop Now
            </Button>
            {!user && !loading && (
              <Button component={Link} to="/login" variant="outlined" size="large">
                Login
              </Button>
            )}
          </Stack>
        </Stack>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={{ p: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>AI Recovery Score</Typography>
            <Typography variant="h3" color="primary.main" fontWeight={800}>92%</Typography>
            <Typography variant="body1" color="text.secondary">High-intent customer recovery confidence</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    <Box mt={6}>
      <Typography variant="h4" gutterBottom>Why CartRescue AI</Typography>
      <Grid container spacing={2}>
        {features.map((feature) => (
          <Grid item xs={12} sm={6} md={3} key={feature}>
            <Card>
              <CardContent>
                <Typography variant="body1">{feature}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  </Container>
  );
};

export default HomePage;
