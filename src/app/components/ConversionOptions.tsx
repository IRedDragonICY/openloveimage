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
  
  // PDF specific
  pageSize?: string;
  orientation?: string;
  dpi?: number;
  pdfCompression?: number;
  imagePlacement?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  imagesPerPage?: number;
  pageLayout?: string;
  embedFonts?: boolean;
  allowPrinting?: boolean;
  allowCopying?: boolean;
  passwordProtect?: boolean;
  ownerPassword?: string;
  userPassword?: string;
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
    { value: 'pdf', label: 'PDF', description: 'Professional document format, printable' },
    { value: 'heic', label: 'HEIC', description: 'Apple format, efficient compression' },
  ];

  // Get format-specific options visibility
  const isJpeg = settings.outputFormat === 'jpeg';
  const isPng = settings.outputFormat === 'png';
  const isWebp = settings.outputFormat === 'webp';
  const isSvg = settings.outputFormat === 'svg';
  const isPdf = settings.outputFormat === 'pdf';
  const supportsQuality = isJpeg || isWebp || isPdf || (!isSvg && !isPng);

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
                  {isSvg ? 'Vectorization Quality' : isPdf ? 'Image Quality in PDF' : 'Quality'}: {settings.quality}%
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
                      ] : isPdf ? [
                        { value: 25, label: 'Small' },
                        { value: 50, label: 'Balanced' },
                        { value: 75, label: 'High' },
                        { value: 100, label: 'Print' },
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

          {/* PDF Specific Options */}
          {isPdf && (
            <>
              {/* Page Setup Row */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: 3 
              }}>
                {/* Page Size */}
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Page Size</InputLabel>
                    <Select
                      value={settings.pageSize || 'A4'}
                      label="Page Size"
                      onChange={(e) => handleChange('pageSize', e.target.value)}
                    >
                      <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
                      <MenuItem value="A3">A3 (297 × 420 mm)</MenuItem>
                      <MenuItem value="A5">A5 (148 × 210 mm)</MenuItem>
                      <MenuItem value="Letter">Letter (8.5 × 11 in)</MenuItem>
                      <MenuItem value="Legal">Legal (8.5 × 14 in)</MenuItem>
                      <MenuItem value="Tabloid">Tabloid (11 × 17 in)</MenuItem>
                      <MenuItem value="Custom">Custom Size</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Orientation */}
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Orientation</InputLabel>
                    <Select
                      value={settings.orientation || 'Portrait'}
                      label="Orientation"
                      onChange={(e) => handleChange('orientation', e.target.value)}
                    >
                      <MenuItem value="Portrait">Portrait</MenuItem>
                      <MenuItem value="Landscape">Landscape</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* DPI */}
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>DPI (Resolution)</InputLabel>
                    <Select
                      value={settings.dpi || 300}
                      label="DPI (Resolution)"
                      onChange={(e) => handleChange('dpi', Number(e.target.value))}
                    >
                      <MenuItem value={72}>72 DPI (Screen)</MenuItem>
                      <MenuItem value={150}>150 DPI (Draft)</MenuItem>
                      <MenuItem value={300}>300 DPI (Print)</MenuItem>
                      <MenuItem value={600}>600 DPI (High Quality)</MenuItem>
                      <MenuItem value={1200}>1200 DPI (Professional)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Image Layout Row */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: 3 
              }}>
                {/* Image Placement */}
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Image Placement</InputLabel>
                    <Select
                      value={settings.imagePlacement || 'fit'}
                      label="Image Placement"
                      onChange={(e) => handleChange('imagePlacement', e.target.value)}
                    >
                      <MenuItem value="fit">Fit to Page (maintain aspect)</MenuItem>
                      <MenuItem value="fill">Fill Page (may crop)</MenuItem>
                      <MenuItem value="center">Center (original size)</MenuItem>
                      <MenuItem value="stretch">Stretch to Fill</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Images Per Page */}
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Images Per Page</InputLabel>
                    <Select
                      value={settings.imagesPerPage || 1}
                      label="Images Per Page"
                      onChange={(e) => handleChange('imagesPerPage', Number(e.target.value))}
                    >
                      <MenuItem value={1}>1 Image per Page</MenuItem>
                      <MenuItem value={2}>2 Images per Page</MenuItem>
                      <MenuItem value={4}>4 Images per Page</MenuItem>
                      <MenuItem value={6}>6 Images per Page</MenuItem>
                      <MenuItem value={9}>9 Images per Page</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Page Layout */}
                <Box sx={{ flex: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Page Layout</InputLabel>
                    <Select
                      value={settings.pageLayout || 'auto'}
                      label="Page Layout"
                      onChange={(e) => handleChange('pageLayout', e.target.value)}
                    >
                      <MenuItem value="auto">Auto Layout</MenuItem>
                      <MenuItem value="grid">Grid Layout</MenuItem>
                      <MenuItem value="vertical">Vertical Stack</MenuItem>
                      <MenuItem value="horizontal">Horizontal Stack</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* PDF Compression */}
              <Box>
                <Typography gutterBottom>
                  PDF Compression Level: {settings.pdfCompression || 5}
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={settings.pdfCompression || 5}
                    onChange={(_, value) => handleChange('pdfCompression', value)}
                    min={1}
                    max={9}
                    step={1}
                    marks={[
                      { value: 1, label: 'None' },
                      { value: 3, label: 'Light' },
                      { value: 5, label: 'Balanced' },
                      { value: 7, label: 'High' },
                      { value: 9, label: 'Maximum' },
                    ]}
                    sx={sliderStyles}
                  />
                </Box>
              </Box>

              {/* Margins */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Page Margins (mm)</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' }, 
                  gap: 2 
                }}>
                  <TextField
                    label="Top"
                    type="number"
                    value={settings.marginTop || 20}
                    onChange={(e) => handleChange('marginTop', Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Bottom"
                    type="number"
                    value={settings.marginBottom || 20}
                    onChange={(e) => handleChange('marginBottom', Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Left"
                    type="number"
                    value={settings.marginLeft || 20}
                    onChange={(e) => handleChange('marginLeft', Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Right"
                    type="number"
                    value={settings.marginRight || 20}
                    onChange={(e) => handleChange('marginRight', Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </>
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

              {/* PDF Advanced Options */}
              {isPdf && (
                <Box>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.embedFonts || true}
                          onChange={(e) => handleChange('embedFonts', e.target.checked)}
                        />
                      }
                      label="Embed Fonts (better compatibility)"
                    />

                    <Typography variant="h6" sx={{ mt: 2 }}>Security Options</Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.passwordProtect || false}
                          onChange={(e) => handleChange('passwordProtect', e.target.checked)}
                        />
                      }
                      label="Password Protection"
                    />

                    {settings.passwordProtect && (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' }, 
                        gap: 2, 
                        ml: 4 
                      }}>
                        <TextField
                          label="User Password (for opening)"
                          type="password"
                          value={settings.userPassword || ''}
                          onChange={(e) => handleChange('userPassword', e.target.value)}
                          placeholder="Leave empty for no user password"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Owner Password (for editing)"
                          type="password"
                          value={settings.ownerPassword || ''}
                          onChange={(e) => handleChange('ownerPassword', e.target.value)}
                          placeholder="Leave empty for no owner password"
                          sx={{ flex: 1 }}
                        />
                      </Box>
                    )}

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.allowPrinting !== false}
                          onChange={(e) => handleChange('allowPrinting', e.target.checked)}
                        />
                      }
                      label="Allow Printing"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.allowCopying !== false}
                          onChange={(e) => handleChange('allowCopying', e.target.checked)}
                        />
                      }
                      label="Allow Text/Image Copying"
                    />

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      🔒 Security features help protect your PDF from unauthorized access and modifications
                    </Typography>
                  </Stack>
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

            {isPdf && (
              <Box sx={{ p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>PDF - Portable Document Format</strong>
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • Best for: Professional documents, multi-page layouts, printing<br/>
                  • Type: Document format with embedded images<br/>
                  • Features: Multi-page support, security options, universal compatibility<br/>
                  • Quality: Preserves original image quality with compression options<br/>
                  • Use case: Reports, portfolios, presentations, archival documents<br/>
                  • Compatibility: Universal - opens on any device with PDF reader<br/>
                  • Professional: Industry standard for document sharing and printing
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