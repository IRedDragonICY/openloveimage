'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Close,
  Info,
  CameraAlt,
  LocationOn,
  Schedule,
  Image as ImageIcon,
  ExpandMore,
  FileDownload,
  Description,
  Code,
  TableChart,
  Web,
  Security,
  Settings,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import exifr from 'exifr';

interface MetadataViewerProps {
  open: boolean;
  onClose: () => void;
  file: File | null;
  fileName: string;
}

interface MetadataGroup {
  title: string;
  icon: React.ReactElement;
  data: { [key: string]: any };
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
}

const ImageMetadataViewer: React.FC<MetadataViewerProps> = ({
  open,
  onClose,
  file,
  fileName,
}) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (open && file) {
      extractMetadata();
    }
  }, [open, file]);

  const calculateChecksum = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const crypto = globalThis.crypto;
      if (crypto && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.error('Checksum calculation failed:', e);
    }
    
    // Fallback checksum
    const uint8Array = new Uint8Array(arrayBuffer);
    let hash = 0;
    for (let i = 0; i < uint8Array.length; i++) {
      hash = ((hash << 5) - hash + uint8Array[i]) & 0xffffffff;
    }
    return Math.abs(hash).toString(16);
  };

  const analyzeFileHeader = (data: Uint8Array) => {
    const header = Array.from(data.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    
    const signature = data.slice(0, 4);
    let fileFormat = 'Unknown';
    let encoding = 'Unknown';
    let byteOrder = 'Unknown';
    
    // JPEG
    if (signature[0] === 0xFF && signature[1] === 0xD8) {
      fileFormat = 'JPEG';
      encoding = 'Baseline DCT, Huffman coding';
      
      // Look for progressive marker
      for (let i = 0; i < Math.min(data.length - 1, 1024); i++) {
        if (data[i] === 0xFF && data[i + 1] === 0xC2) {
          encoding = 'Progressive DCT, Huffman coding';
          break;
        }
      }
      
      // Find EXIF byte order
      for (let i = 0; i < data.length - 10; i++) {
        if (data[i] === 0xFF && data[i + 1] === 0xE1) {
          if (data[i + 4] === 0x45 && data[i + 5] === 0x78) { // "Ex"
            const tiffOffset = i + 10;
            if (tiffOffset < data.length - 1) {
              if (data[tiffOffset] === 0x4D && data[tiffOffset + 1] === 0x4D) {
                byteOrder = 'Big-endian (Motorola, MM)';
              } else if (data[tiffOffset] === 0x49 && data[tiffOffset + 1] === 0x49) {
                byteOrder = 'Little-endian (Intel, II)';
              }
            }
            break;
          }
        }
      }
    }
    // PNG
    else if (signature[0] === 0x89 && signature[1] === 0x50) {
      fileFormat = 'PNG';
      encoding = 'Deflate compression';
    }

    return {
      raw_header: header,
      file_signature: `0x${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(' 0x')}`,
      detected_format: fileFormat,
      encoding_process: encoding,
      exif_byte_order: byteOrder,
    };
  };

  const extractMetadata = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Calculate checksum
      const checksum = await calculateChecksum(arrayBuffer);
      
      // Analyze file header
      const headerAnalysis = analyzeFileHeader(uint8Array);
      
      // Extract EXIF data
      const exifData = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        iptc: true,
        icc: true,
        jfif: true,
        xmp: true,
      });
      
      // Get image dimensions
      const img = new Image();
      const imageData = await new Promise<{width: number, height: number}>((resolve) => {
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);
      });
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeType = file.type || 'unknown';
      
      const imageWidth = exifData?.ExifImageWidth || exifData?.ImageWidth || imageData.width || 0;
      const imageHeight = exifData?.ExifImageHeight || exifData?.ImageHeight || imageData.height || 0;
      const megapixels = imageWidth && imageHeight ? ((imageWidth * imageHeight) / 1000000).toFixed(1) : '0';
      
      // Build comprehensive metadata
      const comprehensiveMetadata = {
        // Checksums & Hashes
        checksum: checksum,
        
        // Basic File Information
        file_name: file.name,
        file_size: file.size,
        file_size_formatted: formatFileSize(file.size),
        file_type: headerAnalysis.detected_format,
        file_type_extension: fileExtension,
        mime_type: mimeType,
        last_modified: new Date(file.lastModified).toLocaleString(),
        
        // Technical Details
        ...headerAnalysis,
        category: 'image',
        
        // Image Properties
        image_width: imageWidth,
        image_height: imageHeight,
        image_size: imageWidth && imageHeight ? `${imageWidth}x${imageHeight}` : 'Unknown',
        megapixels: parseFloat(megapixels),
        aspect_ratio: imageWidth && imageHeight ? (imageWidth / imageHeight).toFixed(3) : 'Unknown',
        
        // Resolution
        x_resolution: exifData?.XResolution || 72,
        y_resolution: exifData?.YResolution || 72,
        resolution_unit: getResolutionUnit(exifData?.ResolutionUnit),
        
        // Color Information
        color_space: exifData?.ColorSpace || 'sRGB',
        bits_per_sample: exifData?.BitsPerSample || 8,
        color_components: getColorComponents(mimeType),
        y_cb_cr_sub_sampling: 'YCbCr4:4:4 (1 1)',
        color_transform: mimeType.includes('jpeg') ? 'YCbCr' : 'RGB',
        
        // Camera Information
        make: exifData?.Make || 'Unknown',
        model: exifData?.Model || 'Unknown',
        software: exifData?.Software || 'Unknown',
        
        // Camera Settings
        iso: exifData?.ISO || exifData?.ISOSpeedRatings || 'Unknown',
        f_number: exifData?.FNumber || 'Unknown',
        exposure_time: exifData?.ExposureTime || 'Unknown',
        focal_length: exifData?.FocalLength || 'Unknown',
        flash: exifData?.Flash !== undefined ? (exifData.Flash === 0 ? 'No Flash' : 'Flash Fired') : 'Unknown',
        white_balance: exifData?.WhiteBalance || 'Unknown',
        exposure_mode: exifData?.ExposureMode || 'Unknown',
        metering_mode: exifData?.MeteringMode || 'Unknown',
        
        // Date & Time
        date_time: exifData?.DateTime || 'Unknown',
        date_time_original: exifData?.DateTimeOriginal || 'Unknown',
        date_time_digitized: exifData?.DateTimeDigitized || 'Unknown',
        
        // GPS Information
        gps_latitude: exifData?.latitude || exifData?.GPSLatitude || 'Unknown',
        gps_longitude: exifData?.longitude || exifData?.GPSLongitude || 'Unknown',
        gps_altitude: exifData?.GPSAltitude || 'Unknown',
        gps_speed: exifData?.GPSSpeed || 'Unknown',
        
        // Technical details
        orientation: exifData?.Orientation || 1,
        compression: exifData?.Compression || 'Unknown',
        photometric_interpretation: exifData?.PhotometricInterpretation || 'Unknown',
        
        // Additional fields
        dct_encode_version: '100',
        app14_flags0: '[14]',
        app14_flags1: '(none)',
        iptc_digest: '0',
        
        // Format-specific details
        ...(mimeType.includes('jpeg') && {
          estimated_quality: estimateJPEGQuality(file.size, imageWidth * imageHeight),
          photoshop_format: headerAnalysis.encoding_process.includes('Progressive') ? 'Progressive' : 'Baseline',
          photoshop_quality: estimatePhotoshopQuality(file.size, imageWidth * imageHeight),
          progressive_scans: headerAnalysis.encoding_process.includes('Progressive') ? '3 Scans' : 'Not progressive',
        }),
        
        // Additional EXIF data
        ...exifData,
        
        // Calculated fields
        pixel_density: imageWidth && imageHeight && file.size ? 
          Math.round(file.size / (imageWidth * imageHeight)) : 'Unknown',
        bytes_per_pixel: imageWidth && imageHeight && file.size ?
          (file.size / (imageWidth * imageHeight)).toFixed(2) : 'Unknown',
      };

      setMetadata(comprehensiveMetadata);
      
    } catch (err) {
      console.error('Error extracting metadata:', err);
      setError('Failed to extract comprehensive metadata from image');
    } finally {
      setLoading(false);
    }
  };

  const getResolutionUnit = (unit: any): string => {
    if (unit === 1) return 'None';
    if (unit === 2) return 'inches';
    if (unit === 3) return 'centimeters';
    return 'inches';
  };

  const getColorComponents = (mimeType: string): number => {
    if (mimeType.includes('jpeg')) return 3;
    if (mimeType.includes('png')) return 4;
    if (mimeType.includes('gif')) return 3;
    return 3;
  };

  const estimateJPEGQuality = (fileSize: number, pixels: number): string => {
    if (pixels === 0) return 'Unknown';
    const bpp = fileSize * 8 / pixels;
    if (bpp > 8) return '95-100 (Maximum)';
    if (bpp > 4) return '85-95 (High)';
    if (bpp > 2) return '75-85 (Medium)';
    if (bpp > 1) return '65-75 (Low)';
    return '50-65 (Very Low)';
  };

  const estimatePhotoshopQuality = (fileSize: number, pixels: number): number => {
    if (pixels === 0) return 12;
    const bpp = fileSize * 8 / pixels;
    if (bpp > 8) return 12;
    if (bpp > 4) return 10;
    if (bpp > 2) return 8;
    if (bpp > 1) return 6;
    return 4;
  };

  const organizeMetadata = (): MetadataGroup[] => {
    if (!metadata) return [];

    const groups: MetadataGroup[] = [];

    // File & Security Information
    const securityInfo: { [key: string]: any } = {};
    ['checksum', 'file_name', 'file_size_formatted', 'file_type', 'file_type_extension', 'mime_type', 
     'last_modified', 'file_signature', 'detected_format', 'category'].forEach(key => {
      if (metadata[key] !== undefined) {
        securityInfo[key] = metadata[key];
      }
    });
    if (Object.keys(securityInfo).length > 0) {
      groups.push({
        title: 'File & Security Information',
        icon: <Security />,
        data: securityInfo,
        color: 'error',
      });
    }

    // Technical Details
    const technicalDetails: { [key: string]: any } = {};
    ['raw_header', 'encoding_process', 'exif_byte_order', 'dct_encode_version', 'app14_flags0', 
     'app14_flags1', 'iptc_digest', 'color_transform', 'estimated_quality', 'photoshop_quality', 
     'photoshop_format', 'progressive_scans'].forEach(key => {
      if (metadata[key] !== undefined) {
        technicalDetails[key] = metadata[key];
      }
    });
    if (Object.keys(technicalDetails).length > 0) {
      groups.push({
        title: 'Technical Details',
        icon: <Settings />,
        data: technicalDetails,
        color: 'secondary',
      });
    }

    // Image Properties
    const imageProps: { [key: string]: any } = {};
    ['image_width', 'image_height', 'image_size', 'megapixels', 'aspect_ratio', 'orientation',
     'bits_per_sample', 'color_components', 'color_space', 'y_cb_cr_sub_sampling',
     'x_resolution', 'y_resolution', 'resolution_unit', 'pixel_density', 'bytes_per_pixel'].forEach(key => {
      if (metadata[key] !== undefined) {
        imageProps[key] = metadata[key];
      }
    });
    if (Object.keys(imageProps).length > 0) {
      groups.push({
        title: 'Image Properties',
        icon: <ImageIcon />,
        data: imageProps,
        color: 'info',
      });
    }

    // Camera Information
    const cameraInfo: { [key: string]: any } = {};
    ['make', 'model', 'software', 'iso', 'f_number', 'exposure_time', 'focal_length', 
     'flash', 'white_balance', 'exposure_mode', 'metering_mode'].forEach(key => {
      if (metadata[key] !== undefined && metadata[key] !== 'Unknown') {
        cameraInfo[key] = metadata[key];
      }
    });
    if (Object.keys(cameraInfo).length > 0) {
      groups.push({
        title: 'Camera Settings',
        icon: <CameraAlt />,
        data: cameraInfo,
        color: 'success',
      });
    }

    // Date & Time
    const dateTime: { [key: string]: any } = {};
    ['date_time', 'date_time_original', 'date_time_digitized'].forEach(key => {
      if (metadata[key] !== undefined && metadata[key] !== 'Unknown') {
        dateTime[key] = metadata[key];
      }
    });
    if (Object.keys(dateTime).length > 0) {
      groups.push({
        title: 'Date & Time',
        icon: <Schedule />,
        data: dateTime,
        color: 'warning',
      });
    }

    // GPS Information
    const gpsInfo: { [key: string]: any } = {};
    ['gps_latitude', 'gps_longitude', 'gps_altitude', 'gps_speed'].forEach(key => {
      if (metadata[key] !== undefined && metadata[key] !== 'Unknown') {
        gpsInfo[key] = metadata[key];
      }
    });
    if (Object.keys(gpsInfo).length > 0) {
      groups.push({
        title: 'GPS Location',
        icon: <LocationOn />,
        data: gpsInfo,
        color: 'success',
      });
    }

    // Additional EXIF Data
    const additionalData: { [key: string]: any } = {};
    Object.keys(metadata).forEach(key => {
      const found = groups.some(group => 
        Object.keys(group.data).includes(key)
      );
      if (!found && metadata[key] !== undefined && key !== 'raw_header') {
        additionalData[key] = metadata[key];
      }
    });
    if (Object.keys(additionalData).length > 0) {
      groups.push({
        title: 'Additional EXIF Data',
        icon: <Info />,
        data: additionalData,
        color: 'primary',
      });
    }

    return groups;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number' && value % 1 !== 0) return value.toFixed(4);
    return String(value);
  };

  const exportMetadata = (format: 'txt' | 'json' | 'csv' | 'html') => {
    if (!metadata) return;

    const groups = organizeMetadata();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = fileName.replace(/\.[^/.]+$/, '');

    let content = '';
    let mimeType = '';
    let extension = '';

    switch (format) {
      case 'txt':
        content = `COMPREHENSIVE IMAGE METADATA REPORT\n`;
        content += `File: ${fileName}\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `${'='.repeat(80)}\n\n`;
        
        groups.forEach(group => {
          content += `${group.title.toUpperCase()}\n`;
          content += `${'-'.repeat(group.title.length)}\n`;
          Object.entries(group.data).forEach(([key, value]) => {
            content += `${key.padEnd(30)}: ${formatValue(value)}\n`;
          });
          content += '\n';
        });
        
        mimeType = 'text/plain';
        extension = 'txt';
        break;

      case 'json':
        const jsonData = {
          file: fileName,
          generated: new Date().toISOString(),
          metadata: Object.fromEntries(groups.map(group => [group.title, group.data])),
          rawMetadata: metadata,
        };
        content = JSON.stringify(jsonData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;

      case 'csv':
        content = 'Category,Property,Value\n';
        groups.forEach(group => {
          Object.entries(group.data).forEach(([key, value]) => {
            const escapedValue = String(formatValue(value)).replace(/"/g, '""');
            content += `"${group.title}","${key}","${escapedValue}"\n`;
          });
        });
        mimeType = 'text/csv';
        extension = 'csv';
        break;

      case 'html':
        content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Metadata Report - ${fileName}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #1976d2; text-align: center; border-bottom: 3px solid #1976d2; padding-bottom: 15px; }
        h2 { color: #424242; background: linear-gradient(90deg, #1976d2, #42a5f5); color: white; padding: 12px; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #1976d2; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .meta-info { background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .footer { text-align: center; margin-top: 40px; color: #666; }
        .checksum { font-family: monospace; word-break: break-all; background: #f5f5f5; padding: 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Comprehensive Image Metadata Report</h1>
        <div class="meta-info">
            <strong>File:</strong> ${fileName}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Analysis:</strong> Complete technical forensics
        </div>`;

        groups.forEach(group => {
          content += `\n        <h2>${group.title}</h2>
        <table>
            <thead>
                <tr><th>Property</th><th>Value</th></tr>
            </thead>
            <tbody>`;
          
          Object.entries(group.data).forEach(([key, value]) => {
            const valueClass = key.includes('checksum') || key.includes('header') ? 'checksum' : '';
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            content += `\n                <tr><td><strong>${displayKey}</strong></td><td class="${valueClass}">${formatValue(value)}</td></tr>`;
          });
          
          content += `\n            </tbody>
        </table>`;
        });

        content += `\n        <div class="footer">
            <p>Generated by OpenLoveImage Comprehensive Metadata Viewer</p>
            <small>Professional metadata analysis tool</small>
        </div>
    </div>
</body>
</html>`;
        mimeType = 'text/html';
        extension = 'html';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, `${baseFileName}_comprehensive_metadata_${timestamp}.${extension}`);
    setExportMenuAnchor(null);
  };

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Security color="primary" />
            <Typography variant="h6">Comprehensive Metadata Analysis</Typography>
            <Chip label={fileName} size="small" variant="outlined" />
          </Box>
          <Box>
            <Tooltip title="Export Report">
              <IconButton onClick={handleExportClick} disabled={!metadata || loading}>
                <FileDownload />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Extracting comprehensive metadata and calculating checksums...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {metadata && !loading && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Analysis complete! Found {Object.keys(metadata).length} metadata fields including checksums and technical details.
            </Alert>
            
            {organizeMetadata().map((group, index) => (
              <Accordion key={index} defaultExpanded={index < 3}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ color: `${group.color}.main`, display: 'flex', alignItems: 'center' }}>
                      {group.icon}
                    </Box>
                    <Typography variant="h6">{group.title}</Typography>
                    <Chip 
                      label={Object.keys(group.data).length} 
                      size="small" 
                      color={group.color}
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Property</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(group.data).map(([key, value]) => (
                          <TableRow key={key} hover>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  wordBreak: key.includes('header') || key.includes('checksum') ? 'break-all' : 'break-word',
                                  fontFamily: key.includes('header') || key.includes('checksum') ? 'monospace' : 'inherit',
                                  fontSize: key.includes('header') || key.includes('checksum') ? '0.8rem' : 'inherit'
                                }}
                              >
                                {formatValue(value)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
      >
        <MenuItem onClick={() => exportMetadata('txt')}>
          <ListItemIcon><Description fontSize="small" /></ListItemIcon>
          <ListItemText>Export as TXT</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => exportMetadata('json')}>
          <ListItemIcon><Code fontSize="small" /></ListItemIcon>
          <ListItemText>Export as JSON</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => exportMetadata('csv')}>
          <ListItemIcon><TableChart fontSize="small" /></ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => exportMetadata('html')}>
          <ListItemIcon><Web fontSize="small" /></ListItemIcon>
          <ListItemText>Export as HTML</ListItemText>
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default ImageMetadataViewer;
