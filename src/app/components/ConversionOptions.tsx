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
  
  // Format-specific settings
  // JPEG specific
  progressive?: boolean;
  optimizeHuffman?: boolean;
  
  // PNG specific
  bitDepth?: number;
  colorType?: string;
  
  // WebP specific
  lossless?: boolean;
  method?: number;
  
  // SVG specific
  vectorColors?: number;
  pathPrecision?: number;
  smoothing?: number;
  simplification?: number;
  vectorQuality?: string;
}

interface ConversionOptionsProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
}

const ConversionOptions = ({ settings, onSettingsChange }: ConversionOptionsProps) => {
  const outputFormats = [
    { value: 'jpeg', label: 'JPEG', description: 'Best for photos and realistic images' },
    { value: 'png', label: 'PNG', description: 'Lossless with transparency support' },
    { value: 'webp', label: 'WebP', description: 'Modern format, excellent compression' },
    { value: 'svg', label: 'SVG', description: 'True vector format, infinite scalability' },
    { value: 'heic', label: 'HEIC', description: 'Apple format, efficient compression' },
  ];

  // Get format-specific options visibility
  const isJpeg = settings.outputFormat === 'jpeg';
  const isPng = settings.outputFormat === 'png';
  const isWebp = settings.outputFormat === 'webp';
  const isSvg = settings.outputFormat === 'svg';
  const supportsQuality = isJpeg || isWebp || (!isSvg && !isPng);

  // Common slider styling to prevent label cutoff
  const sliderStyles = {
    mt: 1,
    '& .MuiSlider-mark': {
      backgroundColor: 'currentColor',
    },
    '& .MuiSlider-markLabel': {
      fontSize: '0.75rem',
      transform: 'translateX(-50%)',
      whiteSpace: 'nowrap',
      '&:first-of-type': {
        transform: 'translateX(-25%)',
      },
      '&:last-of-type': {
        transform: 'translateX(-75%)',
      },
    },
  };

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

            {/* Quality Slider - Show for formats that support it */}
            {supportsQuality && (
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>
                  {isSvg ? 'Vectorization Quality' : 'Quality'}: {settings.quality}%
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={settings.quality}
                    onChange={(_, value) => handleChange('quality', value)}
                    min={10}
                    max={100}
                    step={5}
                    marks={
                      isSvg ? [
                        { value: 25, label: 'Fast' },
                        { value: 50, label: 'Balanced' },
                        { value: 75, label: 'Detailed' },
                        { value: 100, label: 'Maximum' },
                      ] : [
                        { value: 25, label: 'Low' },
                        { value: 50, label: 'Medium' },
                        { value: 75, label: 'High' },
                        { value: 100, label: 'Best' },
                      ]
                    }
                    sx={sliderStyles}
                  />
                </Box>
              </Box>
            )}

                              {/* PNG Compression Level */}
            {isPng && (
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>
                  PNG Compression: {settings.compressionLevel}
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={settings.compressionLevel}
                    onChange={(_, value) => handleChange('compressionLevel', value)}
                    min={0}
                    max={9}
                    step={1}
                    marks={[
                      { value: 0, label: 'None' },
                      { value: 3, label: 'Fast' },
                      { value: 6, label: 'Default' },
                      { value: 9, label: 'Max' },
                    ]}
                    sx={sliderStyles}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Format-Specific Options */}
          
          {/* SVG Vectorization Options */}
          {isSvg && (
            <>
              <Box>
                <Typography gutterBottom>
                  Vector Colors: {settings.vectorColors || 16}
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={settings.vectorColors || 16}
                    onChange={(_, value) => handleChange('vectorColors', value)}
                    min={4}
                    max={64}
                    step={4}
                    marks={[
                      { value: 4, label: 'Simple' },
                      { value: 16, label: 'Standard' },
                      { value: 32, label: 'Rich' },
                      { value: 64, label: 'Maximum' },
                    ]}
                    sx={sliderStyles}
                  />
                </Box>
              </Box>

              <Box>
                <Typography gutterBottom>
                  Path Precision: {settings.pathPrecision || 1.0}
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={settings.pathPrecision || 1.0}
                    onChange={(_, value) => handleChange('pathPrecision', value)}
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: 'High' },
                      { value: 1.0, label: 'Normal' },
                      { value: 1.5, label: 'Smooth' },
                      { value: 2.0, label: 'Simple' },
                    ]}
                    sx={sliderStyles}
                  />
                </Box>
              </Box>
            </>
          )}

          {/* JPEG Specific Options */}
          {isJpeg && (
            <Box>
              <Typography gutterBottom>
                JPEG Compression Level: {settings.compressionLevel}
              </Typography>
              <Box sx={{ px: 2 }}>
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
                  sx={sliderStyles}
                />
              </Box>
            </Box>
          )}

          {/* WebP Method */}
          {isWebp && (
            <Box>
              <Typography gutterBottom>
                WebP Compression Method: {settings.method || 4}
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={settings.method || 4}
                  onChange={(_, value) => handleChange('method', value)}
                  min={0}
                  max={6}
                  step={1}
                  marks={[
                    { value: 0, label: 'Fast' },
                    { value: 3, label: 'Default' },
                    { value: 6, label: 'Slowest' },
                  ]}
                  sx={sliderStyles}
                />
              </Box>
            </Box>
          )}

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
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.removeMetadata}
                    onChange={(e) => handleChange('removeMetadata', e.target.checked)}
                  />
                }
                label="Remove Metadata (EXIF data)"
              />

              {/* JPEG Advanced Options */}
              {isJpeg && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.progressive || false}
                        onChange={(e) => handleChange('progressive', e.target.checked)}
                      />
                    }
                    label="Progressive JPEG (loads gradually)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.optimizeHuffman || false}
                        onChange={(e) => handleChange('optimizeHuffman', e.target.checked)}
                      />
                    }
                    label="Optimize Huffman tables (smaller file)"
                  />
                </>
              )}

              {/* PNG Advanced Options */}
              {isPng && (
                <Box>
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Bit Depth</InputLabel>
                    <Select
                      value={settings.bitDepth || 8}
                      label="Bit Depth"
                      onChange={(e) => handleChange('bitDepth', Number(e.target.value))}
                    >
                      <MenuItem value={1}>1-bit (monochrome)</MenuItem>
                      <MenuItem value={2}>2-bit (4 colors)</MenuItem>
                      <MenuItem value={4}>4-bit (16 colors)</MenuItem>
                      <MenuItem value={8}>8-bit (256 colors)</MenuItem>
                      <MenuItem value={16}>16-bit (65,536 colors)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* WebP Advanced Options */}
              {isWebp && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.lossless || false}
                      onChange={(e) => handleChange('lossless', e.target.checked)}
                    />
                  }
                  label="Lossless compression (larger but perfect quality)"
                />
              )}

              {/* SVG Advanced Options */}
              {isSvg && (
                <Box>
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Vectorization Style</InputLabel>
                    <Select
                      value={settings.vectorQuality || 'balanced'}
                      label="Vectorization Style"
                      onChange={(e) => handleChange('vectorQuality', e.target.value)}
                    >
                      <MenuItem value="simple">Simple (icon-style, minimal paths)</MenuItem>
                      <MenuItem value="balanced">Balanced (photo-friendly)</MenuItem>
                      <MenuItem value="detailed">Detailed (preserve fine details)</MenuItem>
                      <MenuItem value="artistic">Artistic (stylized effect)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    💡 SVG creates true vector graphics that scale infinitely without quality loss
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Format-Specific Information */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {settings.outputFormat.toUpperCase()} Format Information:
            </Typography>
            
            {isJpeg && (
              <Box sx={{ p: 2, bgcolor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>JPEG - Joint Photographic Experts Group</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • Best for: Photos, realistic images with many colors<br/>
                  • Compression: Lossy (some quality loss for smaller files)<br/>
                  • Transparency: Not supported<br/>
                  • Use case: Web photos, email attachments, general photography
                </Typography>
              </Box>
            )}

            {isPng && (
              <Box sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>PNG - Portable Network Graphics</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • Best for: Graphics, logos, images with transparency<br/>
                  • Compression: Lossless (perfect quality, larger files)<br/>
                  • Transparency: Full alpha channel support<br/>
                  • Use case: Logos, screenshots, graphics with text
                </Typography>
              </Box>
            )}

            {isWebp && (
              <Box sx={{ p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>WebP - Modern Web Image Format</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • Best for: Web images, modern browsers<br/>
                  • Compression: Both lossy and lossless options<br/>
                  • Transparency: Supported<br/>
                  • Use case: Web optimization, 25-35% smaller than JPEG/PNG
                </Typography>
              </Box>
            )}

            {isSvg && (
              <Box sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>SVG - Scalable Vector Graphics</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • Best for: Logos, icons, simple graphics, illustrations<br/>
                  • Type: True vector format (not bitmap)<br/>
                  • Scalability: Infinite - zoom without quality loss<br/>
                  • Editing: Fully editable in vector graphics software<br/>
                  • Use case: Logos, icons, print graphics, responsive web design
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ConversionOptions; 