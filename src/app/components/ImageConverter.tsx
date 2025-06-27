'use client';

import { useState, useCallback } from 'react';
import { Container, Box, Typography, Stack, Alert } from '@mui/material';
import UnifiedFileManager, { ProcessedFile } from './UnifiedFileManager';
import ConversionOptions, { ConversionSettings } from './ConversionOptions';
import { ImageConverter as Converter } from '../utils/imageConverter';

const ImageConverterApp = () => {
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>({
    outputFormat: 'jpeg',
    quality: 80,
    maintainAspectRatio: true,
    removeMetadata: false,
    compressionLevel: 5,
  });

  const handleProcessFiles = useCallback(async (files: File[]): Promise<ProcessedFile[]> => {
    const results: ProcessedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const conversionResult = await Converter.convertImage(file, conversionSettings);
        
        if (conversionResult.success && conversionResult.blob) {
          results.push({
            id: `${file.name}-${i}`,
            originalFile: file,
            originalSize: conversionResult.originalSize,
            convertedBlob: conversionResult.blob,
            convertedSize: conversionResult.convertedSize || 0,
            status: 'completed',
            outputFormat: conversionSettings.outputFormat,
          });
        } else {
          results.push({
            id: `${file.name}-${i}`,
            originalFile: file,
            originalSize: conversionResult.originalSize,
            status: 'error',
            error: conversionResult.error || 'Conversion failed',
            outputFormat: conversionSettings.outputFormat,
          });
        }
      } catch (error) {
        results.push({
          id: `${file.name}-${i}`,
          originalFile: file,
          originalSize: file.size,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          outputFormat: conversionSettings.outputFormat,
        });
      }
    }

    return results;
  }, [conversionSettings]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Free Online Image Converter
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Convert your images between different formats easily and securely in your browser
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Alert severity="info" variant="outlined">
              ✅ 100% Free • 🔒 Private & Secure • ⚡ Fast Processing
            </Alert>
          </Box>
        </Box>

        {/* Main Content */}
        <Stack spacing={4}>
          {/* Unified File Manager */}
          <UnifiedFileManager
            onProcessFiles={handleProcessFiles}
            outputFormat={conversionSettings.outputFormat}
          />

          {/* Conversion Options */}
          <ConversionOptions
            settings={conversionSettings}
            onSettingsChange={setConversionSettings}
          />
        </Stack>

        {/* Features Section */}
        <Box id="features" sx={{ mt: 8, mb: 4 }}>
          <Typography variant="h4" component="h2" gutterBottom textAlign="center">
            Why Choose OpenLoveImage?
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 4,
            mt: 4
          }}>
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🚀 Fast & Efficient
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Process multiple images in batch with optimized conversion algorithms
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🔒 Privacy First
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All conversions happen locally in your browser. Your images never leave your device
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🎛️ Advanced Options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Control quality, compression, dimensions, and metadata removal
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📱 Format Support
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Support for HEIC, JPEG, PNG, WebP, GIF, BMP, TIFF, and SVG formats
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                💾 Batch Download
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Download individual files or get all converted images in a ZIP archive
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                💰 Completely Free
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No watermarks, no signup required, no hidden costs. Just free image conversion
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Supported Formats */}
        <Box sx={{ mt: 6, p: 4, backgroundColor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom textAlign="center">
            Supported Formats
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Input:</strong> HEIC, HEIF, JPEG, JPG, PNG, WebP, GIF, BMP, TIFF, SVG
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Output:</strong> JPEG, PNG, WebP (HEIC output not supported in browsers)
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
};

export default ImageConverterApp; 