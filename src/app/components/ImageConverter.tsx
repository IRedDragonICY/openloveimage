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
    
    // Crop settings
    enableCrop: false,
    cropAspectRatio: undefined,
    cropMode: 'center',
    cropSizeMode: 'fit',
    
    // Format-specific defaults
    progressive: false,
    optimizeHuffman: false,
    bitDepth: 8,
    colorType: 'rgba',
    lossless: false,
    method: 4,
    icoSizes: [16, 32, 48],
    icoIncludeAllSizes: false,
    icoExportMode: 'single',
    vectorColors: 16,
    pathPrecision: 1.0,
    smoothing: 1.0,
    simplification: 1.0,
    vectorQuality: 'balanced',
    
    // TIFF-specific defaults
    tiffCompression: 'lzw',
    tiffBitDepth: 8,
    tiffColorModel: 'rgb',
    tiffPredictor: 1,
    tiffTileSize: 0,
    tiffResolutionUnit: 'inch',
    tiffResolutionX: 300,
    tiffResolutionY: 300,
    tiffFillOrder: 'msb2lsb',
    tiffPhotometric: 'rgb',
    tiffPlanarConfig: 'chunky',
    tiffRowsPerStrip: 8,
  });

  const handleProcessFiles = useCallback(async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ProcessedFile[]> => {
    const results: ProcessedFile[] = [];

    try {
      // Use batch conversion for multiple files
      const conversionResults = await Converter.convertMultipleImages(
        files,
        conversionSettings,
        (completed, total) => {
          // Overall progress can be used if needed
        },
        onProgress,
        abortSignal
      );

      // Ensure results array length matches files array length
      if (conversionResults.length !== files.length) {
        console.error(`Length mismatch: files=${files.length}, results=${conversionResults.length}`);
        // If there's a mismatch, create error results for all files
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          results.push({
            id: `${file?.name || 'unknown'}-${i}`,
            originalFile: file,
            originalSize: file?.size || 0,
            status: 'error',
            error: 'Conversion result length mismatch',
            outputFormat: conversionSettings.outputFormat,
          });
        }
        return results;
      }

      // Process the results
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const conversionResult = conversionResults[i];
        
        if (!conversionResult) {
          results.push({
            id: `${file?.name || 'unknown'}-${i}`,
            originalFile: file,
            originalSize: file?.size || 0,
            status: 'error',
            error: 'No conversion result received',
            outputFormat: conversionSettings.outputFormat,
          });
          continue;
        }

        if (conversionResult.success && (conversionResult.blob || conversionResult.isMergedIntoPdf)) {
          results.push({
            id: `${file?.name || 'unknown'}-${i}`,
            originalFile: file,
            originalSize: conversionResult.originalSize,
            convertedBlob: conversionResult.blob,
            convertedSize: conversionResult.convertedSize || 0,
            status: 'completed',
            outputFormat: conversionSettings.outputFormat,
            isMergedIntoPdf: conversionResult.isMergedIntoPdf,
          });
        } else {
          results.push({
            id: `${file?.name || 'unknown'}-${i}`,
            originalFile: file,
            originalSize: conversionResult.originalSize,
            status: 'error',
            error: conversionResult.error || 'Conversion failed',
            outputFormat: conversionSettings.outputFormat,
          });
        }
      }
    } catch (error) {
      // If batch conversion fails, mark all files as error
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        results.push({
          id: `${file?.name || 'unknown'}-${i}`,
          originalFile: file,
          originalSize: file?.size || 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Batch conversion failed',
          outputFormat: conversionSettings.outputFormat,
        });
      }
    }

    return results;
  }, [conversionSettings]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Main Converter Interface */}
        <Stack spacing={4}>
          {/* Unified File Manager */}
          <UnifiedFileManager
            onProcessFiles={handleProcessFiles}
            outputFormat={conversionSettings.outputFormat}
            conversionSettings={conversionSettings}
          />

          {/* Conversion Options */}
          <ConversionOptions
            settings={conversionSettings}
            onSettingsChange={setConversionSettings}
          />
        </Stack>
      </Box>
    </Container>
  );
};

export default ImageConverterApp; 