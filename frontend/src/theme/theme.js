import { createTheme } from '@mui/material/styles';

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#5B8DEF',
      },
      secondary: {
        main: '#14B8A6',
      },
      background: {
        default: mode === 'light' ? '#f4f7fb' : '#101828',
        paper: mode === 'light' ? '#ffffff' : '#111827',
      },
      text: {
        primary: mode === 'light' ? '#111827' : '#f9fafb',
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            fontWeight: 700,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0px 10px 30px rgba(15, 23, 42, 0.08)',
          },
        },
      },
    },
  });

export default getTheme;
