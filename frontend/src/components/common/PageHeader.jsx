import { Box, Typography } from '@mui/material';

const PageHeader = ({ title, subtitle, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
    <Box>
      <Typography variant="h4" fontWeight={700}>{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Box>
);

export default PageHeader;
