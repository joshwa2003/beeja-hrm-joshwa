import { createTheme } from '@mui/material/styles';

// Modern Minimal Color Theme
const colors = {
  primary: {
    main: '#0A192F', // Navy
    light: '#1A2B47',
    dark: '#051220',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#F8F9FA', // Light White
    light: '#FFFFFF',
    dark: '#E9ECEF',
    contrastText: '#1C1C1C',
  },
  accent: {
    main: '#20C997', // Teal (primary accent)
    light: '#40D4AA',
    dark: '#17A085',
    cyan: '#00BFFF', // Bright Cyan (alternative accent)
  },
  background: {
    default: '#FFFFFF', // White background
    paper: '#F8F9FA', // Light White
    secondary: '#F1F3F4', // Slightly darker neutral
  },
  text: {
    primary: '#1C1C1C', // Dark Slate
    secondary: '#4A5568',
    disabled: '#A0AEC0',
  },
  grey: {
    50: '#F8F9FA',
    100: '#F1F3F4',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },
  success: {
    main: '#20C997',
    light: '#40D4AA',
    dark: '#17A085',
  },
  warning: {
    main: '#F6AD55',
    light: '#FBD38D',
    dark: '#ED8936',
  },
  error: {
    main: '#E53E3E',
    light: '#FC8181',
    dark: '#C53030',
  },
  info: {
    main: '#00BFFF',
    light: '#63B3ED',
    dark: '#3182CE',
  },
};

// Typography configuration - Clean, professional fonts
const typography = {
  fontFamily: [
    'Roboto',
    'Open Sans',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    color: colors.text.primary,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.text.primary,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.text.primary,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.text.primary,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.text.primary,
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.text.primary,
  },
  body1: {
    fontSize: '1rem', // 16px
    lineHeight: 1.5,
    color: colors.text.primary,
  },
  body2: {
    fontSize: '0.875rem', // 14px
    lineHeight: 1.5,
    color: colors.text.secondary,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none', // No all-caps for buttons
    letterSpacing: '0.02em',
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
    color: colors.text.secondary,
  },
};

// Component customizations
const components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: colors.background.default,
        color: colors.text.primary,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.paper,
        color: colors.text.primary,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: colors.primary.main,
        color: colors.primary.contrastText,
        borderRight: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.paper,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        borderRadius: 8,
        '&:hover': {
          boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 16px',
        fontWeight: 500,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 4px rgba(0,0,0,0.16)',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.24)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          backgroundColor: colors.background.default,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primary.light,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primary.main,
            borderWidth: 2,
          },
        },
        '& .MuiInputLabel-root': {
          color: colors.text.secondary,
          '&.Mui-focused': {
            color: colors.primary.main,
          },
        },
      },
    },
  },
  MuiDataGrid: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.paper,
        border: 'none',
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: colors.background.secondary,
          borderBottom: `1px solid ${colors.grey[300]}`,
          '& .MuiDataGrid-columnHeader': {
            fontWeight: 600,
            color: colors.text.primary,
          },
        },
        '& .MuiDataGrid-row': {
          '&:nth-of-type(even)': {
            backgroundColor: colors.grey[50], // Zebra striping
          },
          '&:hover': {
            backgroundColor: colors.primary.main + '08', // Hover highlight
          },
        },
        '& .MuiDataGrid-cell': {
          borderBottom: `1px solid ${colors.grey[200]}`,
          color: colors.text.primary,
        },
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.paper,
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.secondary,
        '& .MuiTableCell-head': {
          fontWeight: 600,
          color: colors.text.primary,
          borderBottom: `2px solid ${colors.grey[300]}`,
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:nth-of-type(even)': {
          backgroundColor: colors.grey[50], // Zebra striping
        },
        '&:hover': {
          backgroundColor: colors.primary.main + '08', // Hover highlight
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${colors.grey[200]}`,
        color: colors.text.primary,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      },
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiAlert-root': {
          borderRadius: 8,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        fontWeight: 500,
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '2px 8px',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
        '&.Mui-selected': {
          backgroundColor: 'rgba(255,255,255,0.15)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.2)',
          },
        },
      },
    },
  },
};

// Spacing configuration - Generous padding and margin
const spacing = 8; // 8px base unit

// Create the theme
const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
    text: colors.text,
    grey: colors.grey,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },
  typography,
  components,
  spacing,
  shape: {
    borderRadius: 8,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

export default theme;
