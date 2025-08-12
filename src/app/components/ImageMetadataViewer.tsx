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
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  Select,
  FormControl,
  InputLabel,
  ButtonGroup,
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
  Edit,
  Save,
  Cancel,
  Refresh,
  Delete,
  ContentCopy,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import exifr from 'exifr';
// @ts-ignore - piexifjs doesn't have perfect TypeScript definitions
import piexif from 'piexifjs';

interface MetadataViewerProps {
  open: boolean;
  onClose: () => void;
  file: File | null;
  fileName: string;
  onFileUpdated?: (updatedFile: File) => void;
}

interface MetadataGroup {
  title: string;
  icon: React.ReactElement;
  data: { [key: string]: any };
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
  editable?: boolean;
}

interface EditableField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'datetime-local';
  options?: string[];
  value: any;
  piexifKey?: string;
  group: string;
}

const ImageMetadataViewer: React.FC<MetadataViewerProps> = ({
  open,
  onClose,
  file,
  fileName,
  onFileUpdated,
}) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<any>(null);
  const [originalExifData, setOriginalExifData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);


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
      
      // Extract EXIF data using exifr for display
      const exifData = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        iptc: true,
        icc: true,
        jfif: true,
        xmp: true,
      });
      
      // Extract EXIF data using piexifjs for editing
      let piexifData = null;
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        piexifData = piexif.load(dataUrl);
        setOriginalExifData(piexifData);
      } catch (piexifError) {
        console.warn('Could not load EXIF data with piexifjs:', piexifError);
        // Initialize empty EXIF structure for new data
        setOriginalExifData({
          "0th": {},
          "Exif": {},
          "GPS": {},
          "1st": {},
          "thumbnail": null
        });
      }
      
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
      const orientation = parseOrientation(exifData?.Orientation);
      
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
        orientation: orientation,
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

  // Get all predefined editable field keys to avoid duplication
  const getPredefinedFieldKeys = (): string[] => {
    return [
      'make', 'model', 'software', 'iso', 'f_number', 'exposure_time', 'focal_length', 'white_balance',
      'date_time', 'date_time_original', 'date_time_digitized',
      'gps_latitude', 'gps_longitude', 'gps_altitude',
      'x_resolution', 'y_resolution', 'resolution_unit', 'orientation'
    ];
  };

  // Define comprehensive EXIF fields based on Piexif documentation
  const getEditableFields = (): EditableField[] => {
    const data = isEditMode ? editedMetadata : metadata;
    
    const comprehensiveFields = [
      // === Core Camera Fields ===
      { key: 'make', label: 'Camera Make', type: 'text', value: data?.make || '', piexifKey: 'Make', group: 'camera' },
      { key: 'model', label: 'Camera Model', type: 'text', value: data?.model || '', piexifKey: 'Model', group: 'camera' },
      { key: 'software', label: 'Software', type: 'text', value: data?.software || '', piexifKey: 'Software', group: 'camera' },
      
      // === Camera Settings ===
      { key: 'iso', label: 'ISO Speed', type: 'number', value: data?.iso || data?.ISOSpeedRatings || '', piexifKey: 'ISOSpeedRatings', group: 'settings' },
      { key: 'f_number', label: 'F-Number', type: 'number', value: data?.f_number || data?.FNumber || '', piexifKey: 'FNumber', group: 'settings' },
      { key: 'exposure_time', label: 'Exposure Time', type: 'text', value: data?.exposure_time || data?.ExposureTime || '', piexifKey: 'ExposureTime', group: 'settings' },
      { key: 'focal_length', label: 'Focal Length (mm)', type: 'number', value: data?.focal_length || data?.FocalLength || '', piexifKey: 'FocalLength', group: 'settings' },
      { key: 'white_balance', label: 'White Balance', type: 'select' as const, options: ['Auto', 'Manual'], value: data?.white_balance || data?.WhiteBalance || 'Auto', piexifKey: 'WhiteBalance', group: 'settings' },
      
      // === Date & Time ===
      { key: 'date_time', label: 'Date Time', type: 'datetime-local', value: formatDateForInput(data?.date_time), piexifKey: 'DateTime', group: 'datetime' },
      { key: 'date_time_original', label: 'Date Time Original', type: 'datetime-local', value: formatDateForInput(data?.date_time_original), piexifKey: 'DateTimeOriginal', group: 'datetime' },
      { key: 'date_time_digitized', label: 'Date Time Digitized', type: 'datetime-local', value: formatDateForInput(data?.date_time_digitized), piexifKey: 'DateTimeDigitized', group: 'datetime' },
      
      // === GPS Location ===
      { key: 'gps_latitude', label: 'GPS Latitude', type: 'number', value: data?.gps_latitude || '', piexifKey: 'GPSLatitude', group: 'gps' },
      { key: 'gps_longitude', label: 'GPS Longitude', type: 'number', value: data?.gps_longitude || '', piexifKey: 'GPSLongitude', group: 'gps' },
      { key: 'gps_altitude', label: 'GPS Altitude (m)', type: 'number', value: data?.gps_altitude || '', piexifKey: 'GPSAltitude', group: 'gps' },
      
      // === Image Properties ===
      { key: 'x_resolution', label: 'X Resolution', type: 'number', value: data?.x_resolution || 72, piexifKey: 'XResolution', group: 'image' },
      { key: 'y_resolution', label: 'Y Resolution', type: 'number', value: data?.y_resolution || 72, piexifKey: 'YResolution', group: 'image' },
      { key: 'resolution_unit', label: 'Resolution Unit', type: 'select', options: ['inches', 'centimeters'], value: data?.resolution_unit || 'inches', piexifKey: 'ResolutionUnit', group: 'image' },
      { key: 'orientation', label: 'Orientation', type: 'select', options: Object.keys(ORIENTATION_MAP), value: String(data?.orientation || 1), piexifKey: 'Orientation', group: 'image' },

      // === Comprehensive EXIF Fields ===
      // Creator & Copyright
      { key: 'Artist', label: 'Artist', type: 'text', value: data?.Artist || '', piexifKey: 'Artist', group: 'additional' },
      { key: 'Copyright', label: 'Copyright', type: 'text', value: data?.Copyright || '', piexifKey: 'Copyright', group: 'additional' },
      { key: 'ImageDescription', label: 'Image Description', type: 'text', value: data?.ImageDescription || '', piexifKey: 'ImageDescription', group: 'additional' },
      { key: 'DocumentName', label: 'Document Name', type: 'text', value: data?.DocumentName || '', piexifKey: 'DocumentName', group: 'additional' },
      { key: 'HostComputer', label: 'Host Computer', type: 'text', value: data?.HostComputer || '', piexifKey: 'HostComputer', group: 'additional' },
      { key: 'UserComment', label: 'User Comment', type: 'text', value: data?.UserComment || '', piexifKey: 'UserComment', group: 'additional' },
      
      // Lens Information
      { key: 'LensMake', label: 'Lens Make', type: 'text', value: data?.LensMake || '', piexifKey: 'LensMake', group: 'additional' },
      { key: 'LensModel', label: 'Lens Model', type: 'text', value: data?.LensModel || '', piexifKey: 'LensModel', group: 'additional' },
      { key: 'LensSerialNumber', label: 'Lens Serial Number', type: 'text', value: data?.LensSerialNumber || '', piexifKey: 'LensSerialNumber', group: 'additional' },
      { key: 'LensSpecification', label: 'Lens Specification', type: 'text', value: data?.LensSpecification || '', piexifKey: 'LensSpecification', group: 'additional' },
      
      // Technical Details
      { key: 'ColorSpace', label: 'Color Space', type: 'select', options: ['sRGB', 'Uncalibrated'], value: data?.ColorSpace || data?.color_space || 'sRGB', piexifKey: 'ColorSpace', group: 'additional' },
      { key: 'ExposureProgram', label: 'Exposure Program', type: 'number', value: data?.ExposureProgram || '', piexifKey: 'ExposureProgram', group: 'additional' },
      { key: 'ExposureMode', label: 'Exposure Mode', type: 'number', value: data?.ExposureMode || '', piexifKey: 'ExposureMode', group: 'additional' },
      { key: 'MeteringMode', label: 'Metering Mode', type: 'number', value: data?.MeteringMode || '', piexifKey: 'MeteringMode', group: 'additional' },
      { key: 'LightSource', label: 'Light Source', type: 'number', value: data?.LightSource || '', piexifKey: 'LightSource', group: 'additional' },
      { key: 'Flash', label: 'Flash', type: 'number', value: data?.Flash || '', piexifKey: 'Flash', group: 'additional' },
      { key: 'SensingMethod', label: 'Sensing Method', type: 'number', value: data?.SensingMethod || '', piexifKey: 'SensingMethod', group: 'additional' },
      { key: 'FileSource', label: 'File Source', type: 'number', value: data?.FileSource || '', piexifKey: 'FileSource', group: 'additional' },
      { key: 'SceneType', label: 'Scene Type', type: 'number', value: data?.SceneType || '', piexifKey: 'SceneType', group: 'additional' },
      { key: 'CustomRendered', label: 'Custom Rendered', type: 'number', value: data?.CustomRendered || '', piexifKey: 'CustomRendered', group: 'additional' },
      { key: 'DigitalZoomRatio', label: 'Digital Zoom Ratio', type: 'number', value: data?.DigitalZoomRatio || '', piexifKey: 'DigitalZoomRatio', group: 'additional' },
      { key: 'FocalLengthIn35mmFilm', label: 'Focal Length In 35mm Film', type: 'number', value: data?.FocalLengthIn35mmFilm || '', piexifKey: 'FocalLengthIn35mmFilm', group: 'additional' },
      { key: 'SceneCaptureType', label: 'Scene Capture Type', type: 'number', value: data?.SceneCaptureType || '', piexifKey: 'SceneCaptureType', group: 'additional' },
      { key: 'GainControl', label: 'Gain Control', type: 'number', value: data?.GainControl || '', piexifKey: 'GainControl', group: 'additional' },
      { key: 'Contrast', label: 'Contrast', type: 'number', value: data?.Contrast || '', piexifKey: 'Contrast', group: 'additional' },
      { key: 'Saturation', label: 'Saturation', type: 'number', value: data?.Saturation || '', piexifKey: 'Saturation', group: 'additional' },
      { key: 'Sharpness', label: 'Sharpness', type: 'number', value: data?.Sharpness || '', piexifKey: 'Sharpness', group: 'additional' },
      { key: 'SubjectDistance', label: 'Subject Distance', type: 'number', value: data?.SubjectDistance || '', piexifKey: 'SubjectDistance', group: 'additional' },
      { key: 'SubjectDistanceRange', label: 'Subject Distance Range', type: 'number', value: data?.SubjectDistanceRange || '', piexifKey: 'SubjectDistanceRange', group: 'additional' },
      
      // Camera & Body Information
      { key: 'CameraOwnerName', label: 'Camera Owner Name', type: 'text', value: data?.CameraOwnerName || '', piexifKey: 'CameraOwnerName', group: 'additional' },
      { key: 'BodySerialNumber', label: 'Body Serial Number', type: 'text', value: data?.BodySerialNumber || '', piexifKey: 'BodySerialNumber', group: 'additional' },
      { key: 'CameraSerialNumber', label: 'Camera Serial Number', type: 'text', value: data?.CameraSerialNumber || '', piexifKey: 'CameraSerialNumber', group: 'additional' },
      { key: 'ImageUniqueID', label: 'Image Unique ID', type: 'text', value: data?.ImageUniqueID || '', piexifKey: 'ImageUniqueID', group: 'additional' },
      
      // Extended GPS Fields
      { key: 'GPSVersionID', label: 'GPS Version ID', type: 'text', value: data?.GPSVersionID || '', piexifKey: 'GPSVersionID', group: 'gps' },
      { key: 'GPSDateStamp', label: 'GPS Date Stamp', type: 'text', value: data?.GPSDateStamp || '', piexifKey: 'GPSDateStamp', group: 'gps' },
      { key: 'GPSTimeStamp', label: 'GPS Time Stamp', type: 'text', value: data?.GPSTimeStamp || '', piexifKey: 'GPSTimeStamp', group: 'gps' },
      { key: 'GPSProcessingMethod', label: 'GPS Processing Method', type: 'text', value: data?.GPSProcessingMethod || '', piexifKey: 'GPSProcessingMethod', group: 'gps' },
      { key: 'GPSAreaInformation', label: 'GPS Area Information', type: 'text', value: data?.GPSAreaInformation || '', piexifKey: 'GPSAreaInformation', group: 'gps' },
      { key: 'GPSSpeed', label: 'GPS Speed', type: 'number', value: data?.GPSSpeed || '', piexifKey: 'GPSSpeed', group: 'gps' },
      { key: 'GPSSatellites', label: 'GPS Satellites', type: 'text', value: data?.GPSSatellites || '', piexifKey: 'GPSSatellites', group: 'gps' },
      { key: 'GPSStatus', label: 'GPS Status', type: 'text', value: data?.GPSStatus || '', piexifKey: 'GPSStatus', group: 'gps' },
      { key: 'GPSMeasureMode', label: 'GPS Measure Mode', type: 'text', value: data?.GPSMeasureMode || '', piexifKey: 'GPSMeasureMode', group: 'gps' },
      { key: 'GPSDOP', label: 'GPS DOP', type: 'number', value: data?.GPSDOP || '', piexifKey: 'GPSDOP', group: 'gps' },
      
      // Image Technical Properties
      { key: 'ProcessingSoftware', label: 'Processing Software', type: 'text', value: data?.ProcessingSoftware || '', piexifKey: 'ProcessingSoftware', group: 'additional' },
      { key: 'BitsPerSample', label: 'Bits Per Sample', type: 'number', value: data?.BitsPerSample || '', piexifKey: 'BitsPerSample', group: 'additional' },
      { key: 'Compression', label: 'Compression', type: 'text', value: data?.Compression || '', piexifKey: 'Compression', group: 'additional' },
      { key: 'PhotometricInterpretation', label: 'Photometric Interpretation', type: 'text', value: data?.PhotometricInterpretation || '', piexifKey: 'PhotometricInterpretation', group: 'additional' },
      { key: 'SamplesPerPixel', label: 'Samples Per Pixel', type: 'number', value: data?.SamplesPerPixel || '', piexifKey: 'SamplesPerPixel', group: 'additional' },
      { key: 'PlanarConfiguration', label: 'Planar Configuration', type: 'number', value: data?.PlanarConfiguration || '', piexifKey: 'PlanarConfiguration', group: 'additional' },
      { key: 'YCbCrCoefficients', label: 'YCbCr Coefficients', type: 'text', value: data?.YCbCrCoefficients || '', piexifKey: 'YCbCrCoefficients', group: 'additional' },
      { key: 'YCbCrSubSampling', label: 'YCbCr Sub Sampling', type: 'text', value: data?.YCbCrSubSampling || '', piexifKey: 'YCbCrSubSampling', group: 'additional' },
      { key: 'YCbCrPositioning', label: 'YCbCr Positioning', type: 'number', value: data?.YCbCrPositioning || '', piexifKey: 'YCbCrPositioning', group: 'additional' },
      { key: 'ReferenceBlackWhite', label: 'Reference Black White', type: 'text', value: data?.ReferenceBlackWhite || '', piexifKey: 'ReferenceBlackWhite', group: 'additional' },
      
      // Rating & Classification
      { key: 'Rating', label: 'Rating', type: 'number', value: data?.Rating || '', piexifKey: 'Rating', group: 'additional' },
      { key: 'RatingPercent', label: 'Rating Percent', type: 'number', value: data?.RatingPercent || '', piexifKey: 'RatingPercent', group: 'additional' },
      
      // Exposure & Timing Details
      { key: 'ShutterSpeedValue', label: 'Shutter Speed Value', type: 'number', value: data?.ShutterSpeedValue || '', piexifKey: 'ShutterSpeedValue', group: 'additional' },
      { key: 'ApertureValue', label: 'Aperture Value', type: 'number', value: data?.ApertureValue || '', piexifKey: 'ApertureValue', group: 'additional' },
      { key: 'BrightnessValue', label: 'Brightness Value', type: 'number', value: data?.BrightnessValue || '', piexifKey: 'BrightnessValue', group: 'additional' },
      { key: 'ExposureBiasValue', label: 'Exposure Bias Value', type: 'number', value: data?.ExposureBiasValue || '', piexifKey: 'ExposureBiasValue', group: 'additional' },
      { key: 'MaxApertureValue', label: 'Max Aperture Value', type: 'number', value: data?.MaxApertureValue || '', piexifKey: 'MaxApertureValue', group: 'additional' },
      { key: 'ExposureIndex', label: 'Exposure Index', type: 'number', value: data?.ExposureIndex || '', piexifKey: 'ExposureIndex', group: 'additional' },
      { key: 'FlashEnergy', label: 'Flash Energy', type: 'number', value: data?.FlashEnergy || '', piexifKey: 'FlashEnergy', group: 'additional' },
      
      // Additional Technical Fields
      { key: 'SubSecTime', label: 'Sub Sec Time', type: 'text', value: data?.SubSecTime || '', piexifKey: 'SubSecTime', group: 'additional' },
      { key: 'SubSecTimeOriginal', label: 'Sub Sec Time Original', type: 'text', value: data?.SubSecTimeOriginal || '', piexifKey: 'SubSecTimeOriginal', group: 'additional' },
      { key: 'SubSecTimeDigitized', label: 'Sub Sec Time Digitized', type: 'text', value: data?.SubSecTimeDigitized || '', piexifKey: 'SubSecTimeDigitized', group: 'additional' },
      { key: 'ExifVersion', label: 'Exif Version', type: 'text', value: data?.ExifVersion || '', piexifKey: 'ExifVersion', group: 'additional' },
      { key: 'FlashpixVersion', label: 'Flashpix Version', type: 'text', value: data?.FlashpixVersion || '', piexifKey: 'FlashpixVersion', group: 'additional' },
      { key: 'ComponentsConfiguration', label: 'Components Configuration', type: 'text', value: data?.ComponentsConfiguration || '', piexifKey: 'ComponentsConfiguration', group: 'additional' },
      { key: 'CompressedBitsPerPixel', label: 'Compressed Bits Per Pixel', type: 'number', value: data?.CompressedBitsPerPixel || '', piexifKey: 'CompressedBitsPerPixel', group: 'additional' },
      { key: 'PixelXDimension', label: 'Pixel X Dimension', type: 'number', value: data?.PixelXDimension || '', piexifKey: 'PixelXDimension', group: 'additional' },
      { key: 'PixelYDimension', label: 'Pixel Y Dimension', type: 'number', value: data?.PixelYDimension || '', piexifKey: 'PixelYDimension', group: 'additional' },
      { key: 'RelatedSoundFile', label: 'Related Sound File', type: 'text', value: data?.RelatedSoundFile || '', piexifKey: 'RelatedSoundFile', group: 'additional' },
      { key: 'InteroperabilityIndex', label: 'Interoperability Index', type: 'text', value: data?.InteroperabilityIndex || '', piexifKey: 'InteroperabilityIndex', group: 'additional' },
      { key: 'SpatialFrequencyResponse', label: 'Spatial Frequency Response', type: 'text', value: data?.SpatialFrequencyResponse || '', piexifKey: 'SpatialFrequencyResponse', group: 'additional' },
      { key: 'FocalPlaneXResolution', label: 'Focal Plane X Resolution', type: 'number', value: data?.FocalPlaneXResolution || '', piexifKey: 'FocalPlaneXResolution', group: 'additional' },
      { key: 'FocalPlaneYResolution', label: 'Focal Plane Y Resolution', type: 'number', value: data?.FocalPlaneYResolution || '', piexifKey: 'FocalPlaneYResolution', group: 'additional' },
      { key: 'FocalPlaneResolutionUnit', label: 'Focal Plane Resolution Unit', type: 'number', value: data?.FocalPlaneResolutionUnit || '', piexifKey: 'FocalPlaneResolutionUnit', group: 'additional' },
      { key: 'SubjectLocation', label: 'Subject Location', type: 'text', value: data?.SubjectLocation || '', piexifKey: 'SubjectLocation', group: 'additional' },
      { key: 'SubjectArea', label: 'Subject Area', type: 'text', value: data?.SubjectArea || '', piexifKey: 'SubjectArea', group: 'additional' },
      { key: 'CFAPattern', label: 'CFA Pattern', type: 'text', value: data?.CFAPattern || '', piexifKey: 'CFAPattern', group: 'additional' },
      { key: 'DeviceSettingDescription', label: 'Device Setting Description', type: 'text', value: data?.DeviceSettingDescription || '', piexifKey: 'DeviceSettingDescription', group: 'additional' },
      { key: 'Gamma', label: 'Gamma', type: 'number', value: data?.Gamma || '', piexifKey: 'Gamma', group: 'additional' },
    ];

    // Filter out empty fields if not in edit mode
    if (!isEditMode) {
      return (comprehensiveFields as EditableField[]).filter(field => 
        field.value !== '' && field.value !== undefined && field.value !== null
      );
    }
    
    return comprehensiveFields as EditableField[];
  };

  // Helper function to determine field type based on value
  const getFieldType = (value: any): 'text' | 'number' | 'select' | 'date' | 'datetime-local' => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Check if it's a date/time string
      if (value.match(/^\d{4}[:-]\d{2}[:-]\d{2}[\s\d:]*$/)) return 'datetime-local';
      // Check if it's numeric string
      if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
    }
    return 'text';
  };

  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === 'Unknown') return '';
    try {
      // Handle EXIF date format "YYYY:MM:DD HH:MM:SS"
      const exifDateRegex = /^(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/;
      const match = dateStr.match(exifDateRegex);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      }
      // Try parsing as regular date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 19);
      }
      return '';
    } catch {
      return '';
    }
  };

  const formatDateForExif = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.getFullYear() + ':' + 
             String(date.getMonth() + 1).padStart(2, '0') + ':' + 
             String(date.getDate()).padStart(2, '0') + ' ' +
             String(date.getHours()).padStart(2, '0') + ':' + 
             String(date.getMinutes()).padStart(2, '0') + ':' + 
             String(date.getSeconds()).padStart(2, '0');
    } catch {
      return '';
    }
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setEditedMetadata((prev: any) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const enterEditMode = () => {
    if (!metadata) return;
    setEditedMetadata({ ...metadata });
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditedMetadata(null);
  };

  const resetToOriginal = () => {
    if (!metadata) return;
    setEditedMetadata({ ...metadata });
  };

  const saveMetadata = async () => {
    if (!file || !editedMetadata || !originalExifData) return;

    setSaving(true);
    try {
      // Create a copy of the original EXIF data
      const newExifData = JSON.parse(JSON.stringify(originalExifData));

      // Helper function to safely convert to number
      const toNumber = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };

      // Helper function to safely convert to string
      const toString = (value: any): string => {
        if (value === null || value === undefined || value === '') return '';
        return String(value);
      };

      // Helper function to create rational number [numerator, denominator]
      const toRational = (value: any): [number, number] => {
        const num = toNumber(value);
        if (num === 0) return [0, 1];
        // For whole numbers, use [number, 1]
        if (Number.isInteger(num)) return [num, 1];
        // For decimals, convert to fraction
        const denominator = 100;
        return [Math.round(num * denominator), denominator];
      };

      // Helper function to convert GPS coordinates
      const convertGPSCoordinate = (degrees: number): [[number, number], [number, number], [number, number]] => {
        const absDegrees = Math.abs(degrees);
        const deg = Math.floor(absDegrees);
        const minFloat = (absDegrees - deg) * 60;
        const min = Math.floor(minFloat);
        const sec = (minFloat - min) * 60;
        
        return [
          [deg, 1],
          [min, 1],
          [Math.round(sec * 10000), 10000]
        ];
      };

      // Map edited values to EXIF fields with proper data types
      const editableFields = getEditableFields();
      
      editableFields.forEach(field => {
        const editedValue = editedMetadata[field.key];
        if (editedValue === undefined || editedValue === null) return;

        // Skip empty strings for optional fields
        if (editedValue === '' && !['make', 'model', 'software'].includes(field.key)) return;

        try {
          // Handle different field groups with proper data formatting
          if (field.group === 'camera' || field.group === 'image') {
            if (field.piexifKey === 'Make' && toString(editedValue)) {
              newExifData["0th"][piexif.ImageIFD.Make] = toString(editedValue);
            } else if (field.piexifKey === 'Model' && toString(editedValue)) {
              newExifData["0th"][piexif.ImageIFD.Model] = toString(editedValue);
            } else if (field.piexifKey === 'Software' && toString(editedValue)) {
              newExifData["0th"][piexif.ImageIFD.Software] = toString(editedValue);
            } else if (field.piexifKey === 'XResolution') {
              newExifData["0th"][piexif.ImageIFD.XResolution] = toRational(editedValue);
            } else if (field.piexifKey === 'YResolution') {
              newExifData["0th"][piexif.ImageIFD.YResolution] = toRational(editedValue);
            } else if (field.piexifKey === 'ResolutionUnit') {
              const unitValue = editedValue === 'inches' ? 2 : editedValue === 'centimeters' ? 3 : 2;
              newExifData["0th"][piexif.ImageIFD.ResolutionUnit] = unitValue;
            } else if (field.piexifKey === 'Orientation') {
              newExifData["0th"][piexif.ImageIFD.Orientation] = toNumber(editedValue);
            }
          } else if (field.group === 'settings' || field.group === 'datetime') {
            if (field.piexifKey === 'ISOSpeedRatings') {
              newExifData["Exif"][piexif.ExifIFD.ISOSpeedRatings] = toNumber(editedValue);
            } else if (field.piexifKey === 'FNumber') {
              newExifData["Exif"][piexif.ExifIFD.FNumber] = toRational(editedValue);
            } else if (field.piexifKey === 'ExposureTime') {
              // Handle exposure time as fraction
              const exposureStr = toString(editedValue);
              if (exposureStr.includes('/')) {
                const [num, den] = exposureStr.split('/').map(x => toNumber(x.trim()));
                if (num > 0 && den > 0) {
                  newExifData["Exif"][piexif.ExifIFD.ExposureTime] = [num, den];
                }
              } else {
                const exposure = toNumber(editedValue);
                if (exposure > 0) {
                  newExifData["Exif"][piexif.ExifIFD.ExposureTime] = exposure >= 1 ? [Math.round(exposure), 1] : [1, Math.round(1/exposure)];
                }
              }
            } else if (field.piexifKey === 'FocalLength') {
              newExifData["Exif"][piexif.ExifIFD.FocalLength] = toRational(editedValue);
            } else if (field.piexifKey === 'WhiteBalance') {
              newExifData["Exif"][piexif.ExifIFD.WhiteBalance] = editedValue === 'Auto' ? 0 : 1;
            } else if (field.piexifKey === 'DateTime' && toString(editedValue)) {
              newExifData["0th"][piexif.ImageIFD.DateTime] = formatDateForExif(editedValue);
            } else if (field.piexifKey === 'DateTimeOriginal' && toString(editedValue)) {
              newExifData["Exif"][piexif.ExifIFD.DateTimeOriginal] = formatDateForExif(editedValue);
            } else if (field.piexifKey === 'DateTimeDigitized' && toString(editedValue)) {
              newExifData["Exif"][piexif.ExifIFD.DateTimeDigitized] = formatDateForExif(editedValue);
            }
          } else if (field.group === 'gps') {
            if (field.piexifKey === 'GPSLatitude') {
              const lat = toNumber(editedValue);
              if (lat !== 0) {
                newExifData["GPS"][piexif.GPSIFD.GPSLatitude] = convertGPSCoordinate(lat);
                newExifData["GPS"][piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
              }
            } else if (field.piexifKey === 'GPSLongitude') {
              const lng = toNumber(editedValue);
              if (lng !== 0) {
                newExifData["GPS"][piexif.GPSIFD.GPSLongitude] = convertGPSCoordinate(lng);
                newExifData["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';
              }
            } else if (field.piexifKey === 'GPSAltitude') {
              const alt = toNumber(editedValue);
              if (alt !== 0) {
                newExifData["GPS"][piexif.GPSIFD.GPSAltitude] = [Math.round(Math.abs(alt) * 100), 100];
                newExifData["GPS"][piexif.GPSIFD.GPSAltitudeRef] = alt >= 0 ? 0 : 1;
              }
            }
          } else if (field.group === 'additional') {
            // Handle additional EXIF fields with proper type checking
            const valueStr = toString(editedValue);
            if (!valueStr) return;

            // Map common additional fields to proper EXIF locations with correct types
            if (field.piexifKey === 'Artist') {
              newExifData["0th"][piexif.ImageIFD.Artist] = valueStr;
            } else if (field.piexifKey === 'Copyright') {
              newExifData["0th"][piexif.ImageIFD.Copyright] = valueStr;
            } else if (field.piexifKey === 'ImageDescription') {
              newExifData["0th"][piexif.ImageIFD.ImageDescription] = valueStr;
            } else if (field.piexifKey === 'DocumentName') {
              newExifData["0th"][piexif.ImageIFD.DocumentName] = valueStr;
            } else if (field.piexifKey === 'HostComputer') {
              newExifData["0th"][piexif.ImageIFD.HostComputer] = valueStr;
            } else if (field.piexifKey === 'UserComment') {
              newExifData["Exif"][piexif.ExifIFD.UserComment] = valueStr;
            } else if (field.piexifKey === 'LensModel') {
              newExifData["Exif"][piexif.ExifIFD.LensModel] = valueStr;
            } else if (field.piexifKey === 'LensMake') {
              newExifData["Exif"][piexif.ExifIFD.LensMake] = valueStr;
            } else if (field.piexifKey === 'ColorSpace') {
              newExifData["Exif"][piexif.ExifIFD.ColorSpace] = valueStr === 'sRGB' ? 1 : 65535;
            } else if (field.piexifKey === 'GPSDateStamp') {
              newExifData["GPS"][piexif.GPSIFD.GPSDateStamp] = valueStr;
            } else if (field.piexifKey === 'GPSTimeStamp') {
              // GPS TimeStamp should be in [hour, minute, second] rational format
              if (valueStr.includes(':')) {
                const timeParts = valueStr.split(':').map(x => toNumber(x.trim()));
                if (timeParts.length >= 3) {
                  newExifData["GPS"][piexif.GPSIFD.GPSTimeStamp] = [
                    [timeParts[0], 1],
                    [timeParts[1], 1], 
                    [timeParts[2], 1]
                  ];
                }
              }
            } else if (field.piexifKey === 'GPSProcessingMethod') {
              newExifData["GPS"][piexif.GPSIFD.GPSProcessingMethod] = valueStr;
            } else if (field.piexifKey === 'GPSAreaInformation') {
              newExifData["GPS"][piexif.GPSIFD.GPSAreaInformation] = valueStr;
            } else if (field.piexifKey === 'SubjectDistance') {
              const distance = toNumber(editedValue);
              if (distance > 0) {
                newExifData["Exif"][piexif.ExifIFD.SubjectDistance] = toRational(distance);
              }
            } else if (field.piexifKey === 'SceneCaptureType') {
              newExifData["Exif"][piexif.ExifIFD.SceneCaptureType] = toNumber(editedValue);
            } else if (field.piexifKey === 'GainControl') {
              newExifData["Exif"][piexif.ExifIFD.GainControl] = toNumber(editedValue);
            } else if (field.piexifKey === 'Contrast') {
              newExifData["Exif"][piexif.ExifIFD.Contrast] = toNumber(editedValue);
            } else if (field.piexifKey === 'Saturation') {
              newExifData["Exif"][piexif.ExifIFD.Saturation] = toNumber(editedValue);
            } else if (field.piexifKey === 'Sharpness') {
              newExifData["Exif"][piexif.ExifIFD.Sharpness] = toNumber(editedValue);
            } else if (field.piexifKey === 'DigitalZoomRatio') {
              newExifData["Exif"][piexif.ExifIFD.DigitalZoomRatio] = toRational(editedValue);
            }
          }
        } catch (fieldError) {
          console.warn(`Failed to set field ${field.key}:`, fieldError);
        }
      });

      // Clean up empty GPS section if no GPS data
      if (newExifData["GPS"] && Object.keys(newExifData["GPS"]).length === 0) {
        delete newExifData["GPS"];
      }

      // Convert the modified EXIF data to bytes
      const exifBytes = piexif.dump(newExifData);

      // Read the original file as data URL
      const reader = new FileReader();
      const originalDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Insert the new EXIF data into the image
      const modifiedDataUrl = piexif.insert(exifBytes, originalDataUrl);

      // Convert back to File
      const response = await fetch(modifiedDataUrl);
      const blob = await response.blob();
      const modifiedFile = new File([blob], file.name, { type: file.type });

      // Update the metadata state with edited values
      setMetadata({ ...editedMetadata });
      
      // Notify parent component of the updated file
      if (onFileUpdated) {
        onFileUpdated(modifiedFile);
      }

      // Exit edit mode
      setIsEditMode(false);
      setEditedMetadata(null);

      // Show success message
      console.log('Metadata saved successfully!');

    } catch (error) {
      console.error('Error saving metadata:', error);
      setError('Failed to save metadata changes. Please check that all values are in the correct format.');
    } finally {
      setSaving(false);
    }
  };

  // Preset functions
  const applyPreset = (presetType: string) => {
    if (!metadata) return;
    
    let presetData = { ...metadata };
    
    switch (presetType) {
      case 'remove_personal':
        // Remove personal/location data
        presetData = {
          ...presetData,
          make: 'Unknown',
          model: 'Unknown',
          software: 'Unknown',
          gps_latitude: '',
          gps_longitude: '',
          gps_altitude: '',
          date_time_original: '',
          date_time_digitized: '',
          // Remove GPS related additional fields
          GPSLatitude: '',
          GPSLongitude: '',
          GPSAltitude: '',
          GPSDateStamp: '',
          GPSTimeStamp: '',
          GPSProcessingMethod: '',
          GPSAreaInformation: '',
        };
        break;
      case 'anonymous':
        // Completely anonymous
        presetData = {
          ...presetData,
          make: '',
          model: '',
          software: '',
          gps_latitude: '',
          gps_longitude: '',
          gps_altitude: '',
          date_time: '',
          date_time_original: '',
          date_time_digitized: '',
          // Remove all potentially identifying additional fields
          Artist: '',
          Copyright: '',
          ImageDescription: '',
          UserComment: '',
          DocumentName: '',
          HostComputer: '',
          GPSLatitude: '',
          GPSLongitude: '',
          GPSAltitude: '',
          GPSDateStamp: '',
          GPSTimeStamp: '',
          GPSProcessingMethod: '',
          GPSAreaInformation: '',
        };
        break;
      case 'standard':
        // Keep technical data, remove personal
        presetData = {
          ...presetData,
          gps_latitude: '',
          gps_longitude: '',
          gps_altitude: '',
          // Remove GPS related additional fields
          GPSLatitude: '',
          GPSLongitude: '',
          GPSAltitude: '',
          GPSDateStamp: '',
          GPSTimeStamp: '',
          GPSProcessingMethod: '',
          GPSAreaInformation: '',
        };
        break;
    }
    
    setEditedMetadata(presetData);
    setPresetMenuAnchor(null);
  };

  const handlePresetClick = (event: React.MouseEvent<HTMLElement>) => {
    setPresetMenuAnchor(event.currentTarget);
  };

  const handlePresetClose = () => {
    setPresetMenuAnchor(null);
  };

  const ORIENTATION_MAP: { [key: number]: string } = {
    1: 'Horizontal (normal)',
    2: 'Mirror horizontal',
    3: 'Rotate 180',
    4: 'Mirror vertical',
    5: 'Mirror horizontal and rotate 270 CW',
    6: 'Rotate 90 CW',
    7: 'Mirror horizontal and rotate 90 CW',
    8: 'Rotate 270 CW',
  };

  const REVERSE_ORIENTATION_MAP: { [key: string]: number } = Object.fromEntries(
    Object.entries(ORIENTATION_MAP).map(([k, v]) => [v, parseInt(k)])
  );

  const parseOrientation = (value: any): number => {
    if (typeof value === 'number' && value >= 1 && value <= 8) {
      return value;
    }
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 1 && num <= 8) {
        return num;
      }
      return REVERSE_ORIENTATION_MAP[value] || 1;
    }
    return 1;
  };

  const formatOrientation = (value: any): string => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (typeof num === 'number' && ORIENTATION_MAP[num]) {
      return ORIENTATION_MAP[num];
    }
    return 'Unknown';
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
        editable: true,
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
        editable: true,
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
        editable: true,
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
        editable: true,
      });
    }

    // Additional EXIF Data
    const additionalData: { [key: string]: any } = {};
    const predefinedKeys = getPredefinedFieldKeys();
    const excludedKeys = [
      'raw_header', 'checksum', 'file_name', 'file_size', 'file_size_formatted', 'file_type', 'file_type_extension', 
      'mime_type', 'last_modified', 'file_signature', 'detected_format', 'category',
      // Technical details that are already shown in other groups
      'encoding_process', 'exif_byte_order', 'dct_encode_version', 'app14_flags0', 'app14_flags1', 
      'iptc_digest', 'color_transform', 'estimated_quality', 'photoshop_quality', 'photoshop_format', 
      'progressive_scans', 'image_width', 'image_height', 'image_size', 'megapixels', 'aspect_ratio',
      'bits_per_sample', 'color_components', 'color_space', 'y_cb_cr_sub_sampling', 'pixel_density', 
      'bytes_per_pixel', 'flash', 'exposure_mode', 'metering_mode', 'compression', 'photometric_interpretation',
      'gps_speed'
    ];
    
    Object.keys(metadata).forEach(key => {
      const foundInGroups = groups.some(group => 
        Object.keys(group.data).includes(key)
      );
      const isPredefined = predefinedKeys.includes(key);
      const isExcluded = excludedKeys.includes(key);
      
      if (!foundInGroups && !isPredefined && !isExcluded && metadata[key] !== undefined) {
        additionalData[key] = metadata[key];
      }
    });
    
    if (Object.keys(additionalData).length > 0) {
      groups.push({
        title: 'Additional EXIF Data',
        icon: <Info />,
        data: additionalData,
        color: 'primary',
        editable: true,
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

  const renderEditableField = (field: EditableField) => {
    const currentValue = editedMetadata?.[field.key] ?? field.value;
    
    if (field.key === 'orientation') {
      return (
        <FormControl fullWidth size="small">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={String(currentValue || '1')}
            onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value))}
            label={field.label}
          >
            {Object.entries(ORIENTATION_MAP).map(([key, desc]) => (
              <MenuItem key={key} value={key}>{`${key}: ${desc}`}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    
    switch (field.type) {
      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              label={field.label}
            >
              {field.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'datetime-local':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            type="datetime-local"
            value={currentValue || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        );
      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label}
            value={currentValue || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        );
    }
  };

  const exportMetadata = async (format: 'txt' | 'json' | 'csv' | 'html') => {
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
    try {
      const anyWindow = window as unknown as { showSaveFilePicker?: Function };
      const suggestedName = `${baseFileName}_comprehensive_metadata_${timestamp}.${extension}`;
      if (typeof anyWindow.showSaveFilePicker === 'function') {
        try {
          const handle: any = await anyWindow.showSaveFilePicker!({
            suggestedName,
            types: [
              { description: 'Report', accept: { [mimeType]: [`.${extension}`] } },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err && (err.name === 'AbortError' || /aborted/i.test(err.message || ''))) {
            setExportMenuAnchor(null);
            return; // cancelled – do not fallback
          }
          // Fallback to download below
          saveAs(blob, suggestedName);
        }
      } else {
        saveAs(blob, suggestedName);
      }
    } finally {
      setExportMenuAnchor(null);
    }
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
            {isEditMode ? <Edit color="primary" /> : <Security color="primary" />}
            <Typography variant="h6">
              {isEditMode ? 'Edit Metadata' : 'Comprehensive Metadata Analysis'}
            </Typography>
            <Chip label={fileName} size="small" variant="outlined" />
            {isEditMode && <Chip label="EDITING" size="small" color="warning" />}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {!isEditMode ? (
              <>
                <Tooltip title="Edit Metadata">
                  <IconButton onClick={enterEditMode} disabled={!metadata || loading}>
                    <Edit />
                  </IconButton>
                </Tooltip>
            <Tooltip title="Export Report">
              <IconButton onClick={handleExportClick} disabled={!metadata || loading}>
                <FileDownload />
              </IconButton>
            </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Apply Preset">
                  <IconButton onClick={handlePresetClick} disabled={saving}>
                    <Settings />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset to Original">
                  <IconButton onClick={resetToOriginal} disabled={saving}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Save Changes">
                  <IconButton onClick={saveMetadata} disabled={saving} color="primary">
                    <Save />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel Edit">
                  <IconButton onClick={exitEditMode} disabled={saving}>
                    <Cancel />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <IconButton onClick={onClose} disabled={saving}>
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
                  {isEditMode && group.editable ? (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Edit the fields below. Changes will be applied when you save.
                        </Typography>
                      </Alert>
                      <Stack spacing={2}>
                        {getEditableFields()
                          .filter(field => {
                            // Filter fields by group context
                            if (group.title === 'Camera Settings') return ['make', 'model', 'software', 'iso', 'f_number', 'exposure_time', 'focal_length', 'white_balance'].includes(field.key);
                            if (group.title === 'Date & Time') return ['date_time', 'date_time_original', 'date_time_digitized'].includes(field.key);
                            if (group.title === 'GPS Location') return ['gps_latitude', 'gps_longitude', 'gps_altitude'].includes(field.key);
                            if (group.title === 'Image Properties') return ['x_resolution', 'y_resolution', 'resolution_unit', 'orientation'].includes(field.key);
                            if (group.title === 'Additional EXIF Data') return field.group === 'additional';
                            return false;
                          })
                          .map(field => (
                            <Box key={field.key}>
                              {renderEditableField(field)}
                            </Box>
                          ))
                        }
                        

                      </Stack>
                    </Box>
                  ) : (
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
                                {key === 'orientation' ? formatOrientation(value) : formatValue(value)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {isEditMode && (
          <Box display="flex" gap={1} width="100%" justifyContent="space-between">
            <Box display="flex" gap={1}>
              <Button
                startIcon={<Settings />}
                onClick={handlePresetClick}
                disabled={saving}
              >
                Apply Preset
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={resetToOriginal}
                disabled={saving}
              >
                Reset
              </Button>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<Cancel />}
                onClick={exitEditMode}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                startIcon={<Save />}
                onClick={saveMetadata}
                disabled={saving}
                variant="contained"
                color="primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        )}
        {!isEditMode && (
        <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>

      {/* Export Menu */}
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

      {/* Preset Menu */}
      <Menu
        anchorEl={presetMenuAnchor}
        open={Boolean(presetMenuAnchor)}
        onClose={handlePresetClose}
      >

        <Divider />
        <MenuItem onClick={() => applyPreset('standard')}>
          <ListItemIcon><Security fontSize="small" /></ListItemIcon>
          <ListItemText>
            <Box>
              <Typography variant="body2" fontWeight="bold">Standard</Typography>
              <Typography variant="caption" color="text.secondary">
                Keep technical data, remove GPS location
              </Typography>
            </Box>
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => applyPreset('remove_personal')}>
          <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
          <ListItemText>
            <Box>
              <Typography variant="body2" fontWeight="bold">Remove Personal Data</Typography>
              <Typography variant="caption" color="text.secondary">
                Remove camera info, GPS, and timestamps
              </Typography>
            </Box>
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => applyPreset('anonymous')}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>
            <Box>
              <Typography variant="body2" fontWeight="bold">Anonymous</Typography>
              <Typography variant="caption" color="text.secondary">
                Remove all identifying metadata
              </Typography>
            </Box>
          </ListItemText>
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default ImageMetadataViewer;
