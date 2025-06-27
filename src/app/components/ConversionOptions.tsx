'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Stack,
} from '@mui/material';
import { Settings, Tune } from '@mui/icons-material';

export interface ConversionSettings {
  outputFormat: string;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio: boolean;
  removeMetadata: boolean;
  compressionLevel: number;
}

interface ConversionOptionsProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
}

const ConversionOptions = ({ settings, onSettingsChange }: ConversionOptionsProps) => {
  const outputFormats = [
    { value: 'jpeg', label: 'JPEG', description: 'Best for photos' },
    { value: 'png', label: 'PNG', description: 'Best for graphics with transparency' },
    { value: 'webp', label: 'WebP', description: 'Modern format, smaller size' },
    { value: 'heic', label: 'HEIC', description: 'Apple format, efficient compression' },
  ];

  const handleChange = (field: keyof ConversionSettings, value: string | number | boolean | undefined) => {
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Settings sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">Conversion Options</Typography>
        </Box>

        <Stack spacing={3}>
          {/* Output Format and Quality Row */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 3 
          }}>
            {/* Output Format */}
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={settings.outputFormat}
                  label="Output Format"
                  onChange={(e) => handleChange('outputFormat', e.target.value)}
                >
                  {outputFormats.map((format) => (
                    <MenuItem key={format.value} value={format.value}>
                      <Box>
                        <Typography variant="body1">{format.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Quality Slider */}
            <Box sx={{ flex: 1 }}>
              <Typography gutterBottom>
                Quality: {settings.quality}%
              </Typography>
              <Slider
                value={settings.quality}
                onChange={(_, value) => handleChange('quality', value)}
                min={10}
                max={100}
                step={5}
                marks={[
                  { value: 25, label: 'Low' },
                  { value: 50, label: 'Medium' },
                  { value: 75, label: 'High' },
                  { value: 100, label: 'Best' },
                ]}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          {/* Compression Level */}
          <Box>
            <Typography gutterBottom>
              Compression Level: {settings.compressionLevel}
            </Typography>
            <Slider
              value={settings.compressionLevel}
              onChange={(_, value) => handleChange('compressionLevel', value)}
              min={1}
              max={9}
              step={1}
              marks={[
                { value: 1, label: 'Fast' },
                { value: 5, label: 'Balanced' },
                { value: 9, label: 'Best' },
              ]}
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />
          
          {/* Resize Options Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Tune sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Resize Options</Typography>
          </Box>

          {/* Resize Options Row */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 3 
          }}>
            {/* Max Width */}
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Max Width (px)"
                type="number"
                value={settings.maxWidth || ''}
                onChange={(e) => handleChange('maxWidth', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Original"
                helperText="Leave empty for original size"
              />
            </Box>

            {/* Max Height */}
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Max Height (px)"
                type="number"
                value={settings.maxHeight || ''}
                onChange={(e) => handleChange('maxHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Original"
                helperText="Leave empty for original size"
              />
            </Box>

            {/* Aspect Ratio */}
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', md: 'center' }
            }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.maintainAspectRatio}
                    onChange={(e) => handleChange('maintainAspectRatio', e.target.checked)}
                  />
                }
                label="Maintain Aspect Ratio"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          {/* Advanced Options */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Advanced Options</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.removeMetadata}
                  onChange={(e) => handleChange('removeMetadata', e.target.checked)}
                />
              }
              label="Remove Metadata (EXIF data)"
              sx={{ mb: 1 }}
            />
          </Box>

          {/* Format Info */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Format Information:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label="HEIC: Apple format, best compression" />
              <Chip size="small" label="JPEG: Universal, good for photos" />
              <Chip size="small" label="PNG: Lossless, supports transparency" />
              <Chip size="small" label="WebP: Modern, smaller file sizes" />
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ConversionOptions; 