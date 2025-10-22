import { createTheme } from '@mui/material/styles';

// Cyberpunk color palette
const cyberpunkColors = {
  primary: {
    main: '#00FFFF', // Neon cyan
    light: '#66FFFF',
    dark: '#00CCCC',
  },
  secondary: {
    main: '#FF0080', // Neon pink
    light: '#FF66B3',
    dark: '#CC0066',
  },
  background: {
    default: '#0A0A0F', // Deep dark blue
    paper: 'rgba(15, 15, 25, 0.8)', // Semi-transparent dark
  },
  surface: {
    glass: 'rgba(255, 255, 255, 0.05)', // Glassmorphism
    glow: 'rgba(0, 255, 255, 0.1)', // Cyan glow
    card: 'rgba(20, 20, 35, 0.9)', // Card background
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    accent: '#00FFFF',
  },
  success: {
    main: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.3)',
  },
  warning: {
    main: '#FFB800',
    glow: 'rgba(255, 184, 0, 0.3)',
  },
  error: {
    main: '#FF3366',
    glow: 'rgba(255, 51, 102, 0.3)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #16213E 100%)',
    card: 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(30, 30, 50, 0.8) 100%)',
    glow: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 128, 0.1) 100%)',
  },
};

export const cyberpunkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: cyberpunkColors.primary,
    secondary: cyberpunkColors.secondary,
    background: cyberpunkColors.background,
    text: cyberpunkColors.text,
    success: cyberpunkColors.success,
    warning: cyberpunkColors.warning,
    error: cyberpunkColors.error,
  },
  typography: {
    fontFamily: '"Orbitron", "Inter", "Roboto", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '0.1em',
      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      letterSpacing: '0.05em',
      textShadow: '0 0 8px rgba(0, 255, 255, 0.3)',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '0.05em',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.25rem',
      letterSpacing: '0.02em',
    },
    body1: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontSize: '0.95rem',
    },
    body2: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontSize: '0.85rem',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: cyberpunkColors.gradients.primary,
          minHeight: '100vh',
          overflow: 'hidden',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.1)',
        },
        '*::-webkit-scrollbar-thumb': {
          background: cyberpunkColors.primary.main,
          borderRadius: '4px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: cyberpunkColors.gradients.card,
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
            border: '1px solid rgba(0, 255, 255, 0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.02em',
          transition: 'all 0.3s ease',
        },
        contained: {
          background: `linear-gradient(135deg, ${cyberpunkColors.primary.main} 0%, ${cyberpunkColors.secondary.main} 100%)`,
          boxShadow: `0 4px 20px rgba(0, 255, 255, 0.3)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${cyberpunkColors.primary.light} 0%, ${cyberpunkColors.secondary.light} 100%)`,
            boxShadow: `0 6px 25px rgba(0, 255, 255, 0.4)`,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
        },
        filled: {
          background: 'rgba(0, 255, 255, 0.2)',
          color: cyberpunkColors.primary.main,
          border: '1px solid rgba(0, 255, 255, 0.3)',
        },
      },
    },
  },
});

export { cyberpunkColors };