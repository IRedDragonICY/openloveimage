'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ColorTheme = 
  | 'blue' 
  | 'red' 
  | 'green' 
  | 'purple' 
  | 'orange' 
  | 'teal' 
  | 'pink' 
  | 'indigo';

export interface SettingsState {
  // Preview settings
  enablePreview: boolean;
  
  // Theme settings
  colorTheme: ColorTheme;
  
  // App info
  version: string;
  author: string;
}

export interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  resetSettings: () => void;
}

const defaultSettings: SettingsState = {
  enablePreview: true,
  colorTheme: 'blue',
  version: '0.1.4',
  author: 'ireddragonicy'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('openloveimage-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          ...defaultSettings,
          ...parsed,
          // Always use current version and author
          version: defaultSettings.version,
          author: defaultSettings.author
        });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('openloveimage-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('openloveimage-settings');
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Material You color themes based on Google's design system
export const colorThemes = {
  blue: {
    primary: '#1976d2',
    primaryLight: '#42a5f5',
    primaryDark: '#1565c0',
    secondary: '#0d47a1',
    accent: '#bbdefb'
  },
  red: {
    primary: '#d32f2f',
    primaryLight: '#f44336',
    primaryDark: '#c62828',
    secondary: '#b71c1c',
    accent: '#ffcdd2'
  },
  green: {
    primary: '#388e3c',
    primaryLight: '#4caf50',
    primaryDark: '#2e7d32',
    secondary: '#1b5e20',
    accent: '#c8e6c9'
  },
  purple: {
    primary: '#7b1fa2',
    primaryLight: '#9c27b0',
    primaryDark: '#6a1b9a',
    secondary: '#4a148c',
    accent: '#e1bee7'
  },
  orange: {
    primary: '#f57c00',
    primaryLight: '#ff9800',
    primaryDark: '#ef6c00',
    secondary: '#e65100',
    accent: '#ffe0b2'
  },
  teal: {
    primary: '#00796b',
    primaryLight: '#009688',
    primaryDark: '#00695c',
    secondary: '#004d40',
    accent: '#b2dfdb'
  },
  pink: {
    primary: '#c2185b',
    primaryLight: '#e91e63',
    primaryDark: '#ad1457',
    secondary: '#880e4f',
    accent: '#f8bbd9'
  },
  indigo: {
    primary: '#303f9f',
    primaryLight: '#3f51b5',
    primaryDark: '#283593',
    secondary: '#1a237e',
    accent: '#c5cae9'
  }
}; 