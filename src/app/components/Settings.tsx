'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Paper,
  Divider,
  IconButton,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close,
  Palette,
  Visibility,
  VisibilityOff,
  Info,
  RestartAlt,
  GitHub,
  Person,
  Tag,
} from '@mui/icons-material';
import { useSettings, ColorTheme, colorThemes } from './SettingsContext';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const Settings = ({ open, onClose }: SettingsProps) => {
  const { settings, updateSettings, resetSettings } = useSettings();

  const handlePreviewToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ enablePreview: event.target.checked });
  };

  const handleColorThemeChange = (theme: ColorTheme) => {
    updateSettings({ colorTheme: theme });
  };

  const handleReset = () => {
    resetSettings();
  };

  const colorThemeOptions = [
    { key: 'blue', name: 'Blue', icon: '🔵' },
    { key: 'red', name: 'Red', icon: '🔴' },
    { key: 'green', name: 'Green', icon: '🟢' },
    { key: 'purple', name: 'Purple', icon: '🟣' },
    { key: 'orange', name: 'Orange', icon: '🟠' },
    { key: 'teal', name: 'Teal', icon: '🔵' },
    { key: 'pink', name: 'Pink', icon: '🩷' },
    { key: 'indigo', name: 'Indigo', icon: '🔵' },
  ] as const;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '60vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette color="primary" />
            <Typography variant="h6" component="div">
              Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ py: 2 }}>
          {/* Preview Settings Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {settings.enablePreview ? <Visibility /> : <VisibilityOff />}
              Preview Settings
            </Typography>
            <Card variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enablePreview}
                    onChange={handlePreviewToggle}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Enable Image Preview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Show preview of images during conversion process
                    </Typography>
                  </Box>
                }
              />
            </Card>
          </Box>

          {/* Theme Settings Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette />
              Color Theme
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose your preferred color palette based on Material You design
            </Typography>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: 'repeat(2, 1fr)', 
                sm: 'repeat(3, 1fr)', 
                md: 'repeat(4, 1fr)' 
              }, 
              gap: 2 
            }}>
              {colorThemeOptions.map((option) => {
                const theme = colorThemes[option.key];
                const isSelected = settings.colorTheme === option.key;
                
                return (
                  <Paper
                    key={option.key}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                      },
                      background: isSelected 
                        ? `linear-gradient(135deg, ${theme.accent}20, ${theme.primary}10)`
                        : 'background.paper',
                    }}
                    onClick={() => handleColorThemeChange(option.key)}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})`,
                          margin: '0 auto 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        {option.icon}
                      </Box>
                      <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                        {option.name}
                      </Typography>
                      {isSelected && (
                        <Chip
                          label="Active"
                          size="small"
                          sx={{ 
                            mt: 1, 
                            backgroundColor: theme.primary,
                            color: 'white',
                            fontSize: '10px'
                          }}
                        />
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* App Information Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info />
              Application Information
            </Typography>
            
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    gap: 3 
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Tag color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>
                          Version
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary">
                        v{settings.version}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Person color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>
                          Creator
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary">
                        {settings.author}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <GitHub color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Open Source
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      OpenLoveImage is a free, open-source image converter built with modern web technologies.
                      Your privacy is our priority - all processing happens locally in your browser.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<GitHub />}
                      href="https://github.com/ireddragonicy/openloveimage"
                      target="_blank"
                      size="small"
                    >
                      View on GitHub
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleReset}
          startIcon={<RestartAlt />}
          color="error"
          variant="outlined"
        >
          Reset to Default
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Settings; 