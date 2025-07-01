'use client';

import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { useSettings, colorThemes } from './SettingsContext';

const createDynamicTheme = (colorTheme: string) => {
  const themeColors = colorThemes[colorTheme as keyof typeof colorThemes] || colorThemes.blue;
  
  return createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: themeColors.primary,
        light: themeColors.primaryLight,
        dark: themeColors.primaryDark,
      },
      secondary: {
        main: themeColors.secondary,
        light: themeColors.accent,
        dark: themeColors.primaryDark,
      },
      background: {
        default: '#0a0a0a',
        paper: '#1a1a1a',
      },
      text: {
        primary: '#ededed',
        secondary: '#b3b3b3',
      },
    },
    typography: {
      fontFamily: 'var(--font-geist-sans), Arial, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 500,
            padding: '10px 24px',
          },
          contained: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};

function ThemeProviderContent({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  
  const theme = useMemo(() => {
    return createDynamicTheme(settings.colorTheme);
  }, [settings.colorTheme]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeProviderContent>
      {children}
    </ThemeProviderContent>
  );
} 