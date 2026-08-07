import { Box, Button, Paper, Stack, Typography } from '@mui/material';

const AuthFormCard = ({ title, subtitle, children, onSubmit, submitLabel }) => (
  <Box
    sx={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
    }}
  >
    <Paper elevation={0} sx={{ width: '100%', maxWidth: 500, p: { xs: 3, md: 4 }, border: 1, borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Stack>

      <Box component="form" onSubmit={onSubmit} sx={{ mt: 3 }}>
        <Stack spacing={2}>{children}</Stack>
        <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 2 }}>
          {submitLabel}
        </Button>
      </Box>
    </Paper>
  </Box>
);

export default AuthFormCard;
