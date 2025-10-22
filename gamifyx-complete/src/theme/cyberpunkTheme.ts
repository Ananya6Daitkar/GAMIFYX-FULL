import { createTheme } from '@mui/material/styles'

export const cyberpunkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#4de6ff',
      dark: '#0099cc',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ff0080',
      light: '#ff4da6',
      dark: '#cc0066',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(26, 26, 46, 0.8)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
    success: {
      main: '#00ff88',
      light: '#4dffaa',
      dark: '#00cc6a',
    },
    warning: {
      main: '#ffaa00',
      light: '#ffcc4d',
      dark: '#cc8800',
    },
    error: {
      main: '#ff0044',
      light: '#ff4d77',
      dark: '#cc0036',
    },
    info: {
      main: '#00d4ff',
      light: '#4de6ff',
      dark: '#0099cc',
    },
  },
  typography: {
    fontFamily: '"Orbitron", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      textShadow: '0 0 10px #00d4ff',
      background: 'linear-gradient(45deg, #00d4ff, #ff0080)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      textShadow: '0 0 8px #00d4ff',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      color: '#00d4ff',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.25rem',
      color: '#ffffff',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            border: '1px solid rgba(0, 212, 255, 0.4)',
            boxShadow: '0 12px 40px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
          boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #4de6ff, #00d4ff)',
            boxShadow: '0 6px 20px rgba(0, 212, 255, 0.4)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          border: '2px solid #00d4ff',
          color: '#00d4ff',
          '&:hover': {
            border: '2px solid #4de6ff',
            background: 'rgba(0, 212, 255, 0.1)',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00d4ff',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: 'rgba(0, 212, 255, 0.2)',
          color: '#00d4ff',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          '&:hover': {
            background: 'rgba(0, 212, 255, 0.3)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 212, 255, 0.2)',
          borderRadius: '4px',
        },
        bar: {
          background: 'linear-gradient(45deg, #00d4ff, #ff0080)',
          borderRadius: '4px',
        },
      },
    },
  },
})