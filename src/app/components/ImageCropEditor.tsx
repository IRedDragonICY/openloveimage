'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  Tooltip,
  ButtonGroup,
  TextField,
} from '@mui/material';
import {
  Close,
  RotateLeft,
  RotateRight,
  ZoomIn,
  ZoomOut,
  CropFree,
  AspectRatio,
  Flip,
  GridOn,
  GridOff,
  RestartAlt,
  Check,
  Cancel,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface AspectRatioOption {
  label: string;
  value: number | undefined;
  icon?: React.ReactNode;
}

interface CropSettings {
  crop: Crop;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zoom: number;
  backgroundColor: string;
  backgroundTransparent: boolean;
}

interface ImageCropEditorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (croppedImageBlob: Blob, settings: CropSettings) => void;
  imageFile: File;
  title?: string;
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  { label: 'Free', value: undefined, icon: <CropFree /> },
  { label: '1:1', value: 1, icon: <AspectRatio /> },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:5', value: 4 / 5 },
];

const BACKGROUND_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#F5F5F5', // Light Gray
  '#808080', // Gray
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
];

const GRID_TYPES = [
  { value: 'thirds', label: 'Rule of Thirds', description: '3×3 classic composition grid' },
  { value: 'phi', label: 'Phi Grid', description: 'Golden Ratio (1:1.618) grid' },
  { value: 'golden', label: 'Golden Ratio', description: 'φ (1.618) proportional grid' },
  { value: 'triangle', label: 'Golden Triangles', description: 'Diagonal composition guides' },
  { value: 'dynamic', label: 'Dynamic Symmetry', description: 'Baroque diagonal guides' },
  { value: 'center', label: 'Center Cross', description: 'Center horizontal & vertical lines' },
  { value: 'diagonal', label: 'Diagonal Lines', description: 'Corner-to-corner diagonal guides' },
  { value: 'square4', label: '4×4 Grid', description: 'Square 4×4 grid pattern' },
  { value: 'square6', label: '6×6 Grid', description: 'Fine 6×6 grid pattern' },
  { value: 'square9', label: '9×9 Grid', description: 'Ultra-fine 9×9 grid pattern' },
  { value: 'spiral', label: 'Golden Spiral', description: 'Fibonacci spiral overlay' },
  { value: 'horizon', label: 'Horizon Lines', description: 'Horizontal composition guides' },
];

const ImageCropEditor: React.FC<ImageCropEditorProps> = ({
  open,
  onClose,
  onConfirm,
  imageFile,
  title = 'Crop Image',
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [showGrid, setShowGrid] = useState(true);
  const [gridType, setGridType] = useState<string>('thirds');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [backgroundTransparent, setBackgroundTransparent] = useState(false);
  const [cropSizeMode, setCropSizeMode] = useState<'fit' | 'fill' | 'extend'>('fit');
  
  // Resolution settings
  const [showResolutionInfo, setShowResolutionInfo] = useState(true);
  const [customResolution, setCustomResolution] = useState(false);
  const [targetWidth, setTargetWidth] = useState<number | undefined>(undefined);
  const [targetHeight, setTargetHeight] = useState<number | undefined>(undefined);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [resolutionUpdateKey, setResolutionUpdateKey] = useState(0); // Force re-render key
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateOptimalCrop = useCallback((targetAspectRatio: number, mode: 'fit' | 'fill' | 'extend') => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      console.warn('⚠️ Image not ready for crop calculation');
      return;
    }

    // Use natural (actual) image dimensions for accurate calculation
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const naturalAspectRatio = naturalWidth / naturalHeight;

    console.log(`🚀 Calculating optimal crop with mode: ${mode}`);
    console.log('🖼️ Image natural dimensions:', { naturalWidth, naturalHeight, naturalAspectRatio });
    console.log('🎯 Target aspect ratio:', targetAspectRatio);

    let cropWidth: number;
    let cropHeight: number;

    // Calculate crop dimensions based on the provided size mode
    if (mode === 'fill') {
      // Fill - use full longest dimension for maximum resolution
      const longestSide = Math.max(naturalWidth, naturalHeight);
      
      if (targetAspectRatio >= 1) {
        // Wide/square aspect ratio - use longest side as width
        cropWidth = longestSide;
        cropHeight = cropWidth / targetAspectRatio;
      } else {
        // Tall aspect ratio - use longest side as height
        cropHeight = longestSide;
        cropWidth = cropHeight * targetAspectRatio;
      }
      
      console.log(`🎯 Fill mode: Using longest side ${longestSide} for aspect ${targetAspectRatio}`);
    } else if (mode === 'extend') {
      // Extend - crop can be larger than original image
      const maxDimension = Math.max(naturalWidth, naturalHeight);
      
      if (targetAspectRatio >= 1) {
        // Wide/square aspect ratio - base on width
        cropWidth = maxDimension * 1.2;
        cropHeight = cropWidth / targetAspectRatio;
      } else {
        // Tall aspect ratio - base on height
        cropHeight = maxDimension * 1.2;
        cropWidth = cropHeight * targetAspectRatio;
      }
    } else {
      // Fit (default) - standard crop that fits within image
      if (naturalAspectRatio > targetAspectRatio) {
        // Image is wider than target - crop horizontally (keep full height)
        cropHeight = naturalHeight;
        cropWidth = cropHeight * targetAspectRatio;
      } else {
        // Image is taller than target - crop vertically (keep full width)
        cropWidth = naturalWidth;
        cropHeight = cropWidth / targetAspectRatio;
      }
    }

    // Center the crop
    const cropX = (naturalWidth - cropWidth) / 2;
    const cropY = (naturalHeight - cropHeight) / 2;

    // Convert to percentages for ReactCrop
    const cropPercentage = {
      unit: '%' as const,
      x: (cropX / naturalWidth) * 100,
      y: (cropY / naturalHeight) * 100,
      width: (cropWidth / naturalWidth) * 100,
      height: (cropHeight / naturalHeight) * 100,
    };

    console.log('✂️ Calculated crop (pixels):', { 
      cropX: Math.round(cropX), 
      cropY: Math.round(cropY), 
      cropWidth: Math.round(cropWidth), 
      cropHeight: Math.round(cropHeight) 
    });
    console.log('📐 Calculated crop (%):', cropPercentage);
    console.log('🎯 Result aspect ratio:', (cropWidth / cropHeight).toFixed(3));

    // Force update both crop states
    setCrop(cropPercentage);
    
    // Also force completedCrop to ensure resolution calculation works
    const pixelCrop = {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      unit: 'px' as const
    };
    setCompletedCrop(pixelCrop);
    
    console.log('✅ Crop states updated successfully');
  }, []); // No dependencies, it's a pure calculation function now

  // Load image when file changes
  useEffect(() => {
    if (imageFile && open) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, open]);

  // Reset settings when dialog opens
  useEffect(() => {
    if (open) {
      setCrop({
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      });
      setCompletedCrop(undefined);
      setRotation(0);
      setScaleX(1);
      setScaleY(1);
      setZoom(1);
      setAspect(undefined);
      setShowGrid(true);
      setGridType('thirds');
      setBackgroundColor('#FFFFFF');
      setBackgroundTransparent(false);
      setCropSizeMode('fit');
      
      // Reset resolution settings
      setShowResolutionInfo(true);
      setCustomResolution(false);
      setTargetWidth(undefined);
      setTargetHeight(undefined);
      setMaintainAspectRatio(true);
      setResolutionUpdateKey(0);
      
      console.log('🔄 Dialog opened - all settings reset');
    }
  }, [open]);

  // Force resolution info update when crop changes
  useEffect(() => {
    setResolutionUpdateKey(prev => prev + 1);
  }, [crop, completedCrop]);

  const recalculateCropForAspectRatio = (aspectRatio: number) => {
    calculateOptimalCrop(aspectRatio, cropSizeMode);
  };
  
  const handleAspectRatioChange = useCallback((value: number | undefined) => {
    console.log('🔄 Aspect ratio changing to:', value);
    setAspect(value);
    
    if (value && imgRef.current) {
      // Immediate calculation for responsive UI
      calculateOptimalCrop(value, cropSizeMode);
    } else {
      // Free crop - reset to default
      console.log('🔄 Setting free crop mode');
      setCrop({
        unit: '%', x: 10, y: 10, width: 80, height: 80,
      });
      setCompletedCrop(undefined);
    }
  }, [calculateOptimalCrop, cropSizeMode]);

  // Update crop size mode and recalculate
  const handleCropSizeModeChange = useCallback((newMode: 'fit' | 'fill' | 'extend') => {
    console.log('🔄 Crop size mode changing to:', newMode);
    setCropSizeMode(newMode);
    
    // Recalculate crop with new mode if aspect ratio is set
    if (aspect && imgRef.current) {
      calculateOptimalCrop(aspect, newMode);
    }
  }, [aspect, calculateOptimalCrop]);

  const handleRotationChange = (direction: 'left' | 'right') => {
    const newRotation = direction === 'left' 
      ? rotation - 90 
      : rotation + 90;
    setRotation(newRotation % 360);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    if (direction === 'horizontal') {
      setScaleX(prev => prev * -1);
    } else {
      setScaleY(prev => prev * -1);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(0.1, Math.min(3, newZoom)));
  };

  const resetSettings = () => {
    setRotation(0);
    setScaleX(1);
    setScaleY(1);
    setZoom(1);
    setAspect(undefined);
    setGridType('thirds');
    setCropSizeMode('fit');
    
    // Reset resolution settings
    setCustomResolution(false);
    setTargetWidth(undefined);
    setTargetHeight(undefined);
    setMaintainAspectRatio(true);
    
    // Reset to default free crop
    setCrop({
      unit: '%',
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });
    
    console.log('🔄 Settings reset to default');
  };

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    const canvas = canvasRef.current;
    
    if (!image || !canvas || !completedCrop) {
      console.error("❌ Cropping failed: Prerequisites not met.", { image, canvas, completedCrop });
      return null;
    }

    if (completedCrop.width === 0 || completedCrop.height === 0) {
      console.error("❌ Cropping failed: Crop dimensions are zero.", { completedCrop });
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("❌ Cropping failed: Could not get 2D context.");
      return null;
    }

    // `completedCrop` is already in pixels. We use its values directly.
    const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = completedCrop;

    // Determine final output dimensions based on custom settings
    let outputWidth = Math.round(cropWidth);
    let outputHeight = Math.round(cropHeight);

    if (customResolution && (targetWidth || targetHeight)) {
      const cropAspectRatio = cropWidth / cropHeight;
      if (targetWidth && targetHeight) {
        outputWidth = targetWidth;
        outputHeight = targetHeight;
      } else if (targetWidth) {
        outputWidth = targetWidth;
        outputHeight = Math.round(targetWidth / cropAspectRatio);
      } else if (targetHeight) {
        outputHeight = targetHeight;
        outputWidth = Math.round(targetHeight * cropAspectRatio);
      }
    }

    // Set canvas size to the final output dimensions
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    console.log('🚀 Preparing to draw on canvas:', {
      sourceCrop: { cropX, cropY, cropWidth, cropHeight },
      outputCanvas: { outputWidth, outputHeight },
      transform: { rotation, scaleX, scaleY }
    });

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background if not transparent
    if (!backgroundTransparent) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Save the context state
    ctx.save();

    // Move to the center of the canvas to apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleX, scaleY); // Flipping is handled here. Zoom is for UI only.
    
    // Draw the cropped portion of the image onto the canvas
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -canvas.width / 2,   // Center the image horizontally
      -canvas.height / 2,  // Center the image vertically
      canvas.width,
      canvas.height
    );

    // Restore the context state
    ctx.restore();

    console.log('✅ Canvas drawing complete. Generating blob...');

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('📦 Blob generated successfully:', { size: blob.size, type: blob.type });
            resolve(blob);
          } else {
            console.error('❌ Blob generation failed.');
            reject(new Error('Canvas to Blob conversion failed'));
          }
        },
        'image/png',
        1 // Quality for PNG
      );
    });
  }, [completedCrop, rotation, scaleX, scaleY, backgroundColor, backgroundTransparent, customResolution, targetWidth, targetHeight]);

  const handleConfirm = async () => {
    const croppedImageBlob = await getCroppedImg();
    if (croppedImageBlob) {
      const settings: CropSettings = {
        crop,
        rotation,
        scaleX,
        scaleY,
        zoom,
        backgroundColor,
        backgroundTransparent,
      };
      onConfirm(croppedImageBlob, settings);
    }
    onClose();
  };

  const renderGridLines = () => {
    const commonLineStyle = {
      stroke: "rgba(255,255,255,0.8)",
      strokeWidth: "1",
      strokeDasharray: "2,2",
      vectorEffect: "non-scaling-stroke"
    };
    
    const fineLineStyle = {
      stroke: "rgba(255,255,255,0.4)",
      strokeWidth: "0.5",
      strokeDasharray: "1,1",
      vectorEffect: "non-scaling-stroke"
    };

    switch (gridType) {
      case 'thirds':
        return (
          <>
            {/* Rule of thirds grid */}
            <line x1="33.33%" y1="0%" x2="33.33%" y2="100%" {...commonLineStyle} />
            <line x1="66.66%" y1="0%" x2="66.66%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="33.33%" x2="100%" y2="33.33%" {...commonLineStyle} />
            <line x1="0%" y1="66.66%" x2="100%" y2="66.66%" {...commonLineStyle} />
            {/* Intersection points */}
            <circle cx="33.33%" cy="33.33%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="66.66%" cy="33.33%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="33.33%" cy="66.66%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="66.66%" cy="66.66%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
          </>
        );

      case 'phi':
        // Phi grid based on the Golden Ratio 1.618
        // Lines at 38.2%, 61.8%
        const phiRatio = 1 / 1.618; // approx 0.618
        const p1 = phiRatio * 100;
        const p2 = (1 - phiRatio) * 100;

        return (
          <>
            <line x1={`${p2}%`} y1="0%" x2={`${p2}%`} y2="100%" {...commonLineStyle} />
            <line x1={`${p1}%`} y1="0%" x2={`${p1}%`} y2="100%" {...commonLineStyle} />
            <line x1="0%" y1={`${p2}%`} x2="100%" y2={`${p2}%`} {...commonLineStyle} />
            <line x1="0%" y1={`${p1}%`} x2="100%" y2={`${p1}%`} {...commonLineStyle} />
          </>
        );
        
      case 'golden':
        // Golden ratio: φ = 1.618, positions at ~38.2% and ~61.8%
        return (
          <>
            <line x1="38.2%" y1="0%" x2="38.2%" y2="100%" {...commonLineStyle} />
            <line x1="61.8%" y1="0%" x2="61.8%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="38.2%" x2="100%" y2="38.2%" {...commonLineStyle} />
            <line x1="0%" y1="61.8%" x2="100%" y2="61.8%" {...commonLineStyle} />
            {/* Golden ratio points */}
            <circle cx="38.2%" cy="38.2%" r="2" fill="rgba(255,215,0,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="61.8%" cy="38.2%" r="2" fill="rgba(255,215,0,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="38.2%" cy="61.8%" r="2" fill="rgba(255,215,0,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="61.8%" cy="61.8%" r="2" fill="rgba(255,215,0,0.8)" vectorEffect="non-scaling-stroke" />
          </>
        );

      case 'triangle':
        return (
          <>
            {/* Golden Triangles */}
            <line x1="0%" y1="0%" x2="100%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="100%" x2="100%" y2="0%" {...commonLineStyle} />
            <line x1="0" y1="100%" x2="50%" y2="0" {...fineLineStyle} />
            <line x1="100%" y1="100%" x2="50%" y2="0" {...fineLineStyle} />
          </>
        );

      case 'dynamic':
        return (
          <>
            {/* Dynamic Symmetry / Baroque Diagonals */}
            <line x1="0%" y1="100%" x2="100%" y2="0%" {...commonLineStyle} />
            <line x1="0%" y1="0%" x2="0%" y2="100%" {...commonLineStyle} />
            <line x1="100%" y1="0%" x2="100%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="0%" x2="100%" y2="0%" {...commonLineStyle} />
            <line x1="0%" y1="100%" x2="100%" y2="100%" {...commonLineStyle} />
            
            {/* Reciprocal lines */}
            <line x1="0%" y1="0%" x2="100%" y2="100%" {...fineLineStyle} />
            <line x1="0%" y1="38.2%" x2="61.8%" y2="100%" {...fineLineStyle} />
            <line x1="38.2%" y1="0%" x2="100%" y2="61.8%" {...fineLineStyle} />
          </>
        );

      case 'center':
        return (
          <>
            {/* Center cross */}
            <line x1="50%" y1="0%" x2="50%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="50%" x2="100%" y2="50%" {...commonLineStyle} />
            {/* Center point */}
            <circle cx="50%" cy="50%" r="3" fill="rgba(255,255,255,0.8)" stroke="rgba(0,0,0,0.8)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </>
        );

      case 'diagonal':
        return (
          <>
            {/* Diagonal lines */}
            <line x1="0%" y1="0%" x2="100%" y2="100%" {...commonLineStyle} />
            <line x1="100%" y1="0%" x2="0%" y2="100%" {...commonLineStyle} />
            {/* Center intersection */}
            <circle cx="50%" cy="50%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
          </>
        );

      case 'square4':
        return (
          <>
            {/* 4x4 grid */}
            {Array.from({ length: 3 }, (_, i) => (
              <g key={`4x4-${i}`}>
                <line
                  x1={`${(i + 1) * 25}%`}
                  y1="0%"
                  x2={`${(i + 1) * 25}%`}
                  y2="100%"
                  {...commonLineStyle}
                />
                <line
                  x1="0%"
                  y1={`${(i + 1) * 25}%`}
                  x2="100%"
                  y2={`${(i + 1) * 25}%`}
                  {...commonLineStyle}
                />
              </g>
            ))}
          </>
        );

      case 'square6':
        return (
          <>
            {/* 6x6 grid */}
            {Array.from({ length: 5 }, (_, i) => (
              <g key={`6x6-${i}`}>
                <line
                  x1={`${((i + 1) / 6) * 100}%`}
                  y1="0%"
                  x2={`${((i + 1) / 6) * 100}%`}
                  y2="100%"
                  {...fineLineStyle}
                />
                <line
                  x1="0%"
                  y1={`${((i + 1) / 6) * 100}%`}
                  x2="100%"
                  y2={`${((i + 1) / 6) * 100}%`}
                  {...fineLineStyle}
                />
              </g>
            ))}
          </>
        );

      case 'square9':
        return (
          <>
            {/* 9x9 grid */}
            {Array.from({ length: 8 }, (_, i) => (
              <g key={`9x9-${i}`}>
                <line
                  x1={`${((i + 1) / 9) * 100}%`}
                  y1="0%"
                  x2={`${((i + 1) / 9) * 100}%`}
                  y2="100%"
                  {...fineLineStyle}
                />
                <line
                  x1="0%"
                  y1={`${((i + 1) / 9) * 100}%`}
                  x2="100%"
                  y2={`${((i + 1) / 9) * 100}%`}
                  {...fineLineStyle}
                />
              </g>
            ))}
          </>
        );

      case 'spiral':
        // Simplified golden spiral approximation
        return (
          <>
            <path
              d="M 0,100 Q 0,0 50,0 Q 100,0 100,50 Q 100,100 75,100 Q 50,100 50,75 Q 50,50 62.5,50"
              fill="none"
              stroke="rgba(255,215,0,0.8)"
              strokeWidth="1.5"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="62.5" cy="50" r="2" fill="rgba(255,215,0,0.8)" vectorEffect="non-scaling-stroke" />
          </>
        );

      case 'horizon':
        return (
          <>
            {/* Horizon lines */}
            <line x1="0%" y1="25%" x2="100%" y2="25%" {...commonLineStyle} />
            <line x1="0%" y1="50%" x2="100%" y2="50%" {...commonLineStyle} />
            <line x1="0%" y1="75%" x2="100%" y2="75%" {...commonLineStyle} />
            {/* Horizon markers */}
            <circle cx="10%" cy="25%" r="1.5" fill="rgba(255,255,255,0.6)" vectorEffect="non-scaling-stroke" />
            <circle cx="90%" cy="25%" r="1.5" fill="rgba(255,255,255,0.6)" vectorEffect="non-scaling-stroke" />
            <circle cx="10%" cy="75%" r="1.5" fill="rgba(255,255,255,0.6)" vectorEffect="non-scaling-stroke" />
            <circle cx="90%" cy="75%" r="1.5" fill="rgba(255,255,255,0.6)" vectorEffect="non-scaling-stroke" />
          </>
        );

      default:
        return null;
    }
  };

  const renderGridOverlay = () => {
    if (!showGrid || !imgRef.current || !crop) return null;

    const img = imgRef.current;
    const imgRect = img.getBoundingClientRect();
    const parentRect = img.parentElement?.getBoundingClientRect();
    
    if (!parentRect) return null;

    // Calculate crop area position and size relative to the image container
    let cropX, cropY, cropWidth, cropHeight;
    
    if (crop.unit === '%') {
      cropX = (crop.x / 100) * img.offsetWidth;
      cropY = (crop.y / 100) * img.offsetHeight;
      cropWidth = (crop.width / 100) * img.offsetWidth;
      cropHeight = (crop.height / 100) * img.offsetHeight;
    } else {
      // Convert px to actual display coordinates
      const scaleX = img.offsetWidth / img.naturalWidth;
      const scaleY = img.offsetHeight / img.naturalHeight;
      cropX = crop.x * scaleX;
      cropY = crop.y * scaleY;
      cropWidth = crop.width * scaleX;
      cropHeight = crop.height * scaleY;
    }

    return (
      <Box
        sx={{
          position: 'absolute',
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight,
          pointerEvents: 'none',
          zIndex: 15,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible'
          }}
        >
          {renderGridLines()}
        </svg>
      </Box>
    );
  };

  // Helper function to calculate current crop resolution
  const getCurrentCropResolution = () => {
    if (!imgRef.current) {
      return { width: 0, height: 0, megapixels: 0 };
    }

    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;
    
    // Use completedCrop if available, otherwise fall back to crop state
    const activeCrop = completedCrop || crop;
    
    if (!activeCrop || !activeCrop.width || !activeCrop.height) {
      return { width: 0, height: 0, megapixels: 0 };
    }

    let cropWidth: number;
    let cropHeight: number;

    if (activeCrop.unit === 'px') {
      // Pixel crop (from completedCrop)
      cropWidth = Math.round(activeCrop.width);
      cropHeight = Math.round(activeCrop.height);
    } else {
      // Percentage crop (from crop state)
      cropWidth = Math.round((activeCrop.width / 100) * naturalWidth);
      cropHeight = Math.round((activeCrop.height / 100) * naturalHeight);
    }
    
    const megapixels = (cropWidth * cropHeight) / 1000000;

    return { 
      width: cropWidth, 
      height: cropHeight, 
      megapixels: Number(megapixels.toFixed(2))
    };
  };

  // Helper function to get original image resolution
  const getOriginalResolution = () => {
    if (!imgRef.current) {
      return { width: 0, height: 0, megapixels: 0 };
    }

    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;
    const megapixels = (naturalWidth * naturalHeight) / 1000000;

    return { 
      width: naturalWidth, 
      height: naturalHeight, 
      megapixels: Number(megapixels.toFixed(2))
    };
  };

  // Handle custom resolution change
  const handleResolutionChange = (dimension: 'width' | 'height', value: number | undefined) => {
    if (dimension === 'width') {
      setTargetWidth(value);
      if (maintainAspectRatio && value && aspect) {
        setTargetHeight(Math.round(value / aspect));
      }
    } else {
      setTargetHeight(value);
      if (maintainAspectRatio && value && aspect) {
        setTargetWidth(Math.round(value * aspect));
      }
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">{title}</Typography>
              {imgRef.current && (
                <Typography variant="caption" color="text.secondary">
                  📸 {getOriginalResolution().width} × {getOriginalResolution().height} 
                  {completedCrop && (
                    <> → ✂️ {getCurrentCropResolution().width} × {getCurrentCropResolution().height}</>
                  )}
                  {customResolution && (targetWidth || targetHeight) && (
                    <> → 🎯 {targetWidth || 'Auto'} × {targetHeight || 'Auto'}</>
                  )}
                </Typography>
              )}
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Crop Area */}
            <Box sx={{ flex: 2, minHeight: 0 }}>
              <Box
                sx={{
                  position: 'relative',
                  height: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: backgroundTransparent ? 'transparent' : backgroundColor,
                  backgroundImage: backgroundTransparent
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                    : undefined,
                  backgroundSize: backgroundTransparent ? '20px 20px' : undefined,
                  backgroundPosition: backgroundTransparent ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
                }}
              >
                {imageSrc && (
                  <Box sx={{ position: 'relative' }}>
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => {
                        setCrop(percentCrop);
                        console.log('📐 Crop area changed:', percentCrop);
                      }}
                      onComplete={(c, percentCrop) => {
                        setCompletedCrop(c);
                        console.log('✅ Crop completed:', { pixelCrop: c, percentCrop });
                      }}
                      aspect={aspect}
                      keepSelection
                      minWidth={50}
                      minHeight={50}
                      ruleOfThirds
                    >
                      <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Crop preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '60vh',
                          transform: `rotate(${rotation}deg) scaleX(${scaleX}) scaleY(${scaleY}) scale(${zoom})`,
                          transformOrigin: 'center',
                        }}
                        onLoad={() => {
                          const img = imgRef.current;
                          if (!img) return;
                          
                          console.log('🖼️ Image loaded with natural dimensions:', {
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                          });
                          
                          // Delay to ensure image is fully rendered before calculating
                          setTimeout(() => {
                            if (aspect) {
                              console.log('🎯 onLoad: Auto-calculating crop for aspect ratio:', aspect);
                              calculateOptimalCrop(aspect, cropSizeMode);
                            } else {
                              console.log('🔄 onLoad: Setting default free crop');
                              const defaultCrop = {
                                unit: '%' as const, x: 10, y: 10, width: 80, height: 80,
                              };
                              setCrop(defaultCrop);
                              
                              const pixelCrop = {
                                unit: 'px' as const,
                                x: (defaultCrop.x / 100) * img.naturalWidth,
                                y: (defaultCrop.y / 100) * img.naturalHeight,
                                width: (defaultCrop.width / 100) * img.naturalWidth,
                                height: (defaultCrop.height / 100) * img.naturalHeight,
                              };
                              setCompletedCrop(pixelCrop);
                            }
                          }, 150);
                        }}
                      />
                    </ReactCrop>
                    {renderGridOverlay()}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Control Panel */}
            <Box sx={{ flex: 1, borderLeft: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Crop Settings
                </Typography>

                {/* Aspect Ratio */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Aspect Ratio
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {ASPECT_RATIOS.map((ratio) => (
                      <Chip
                        key={ratio.label}
                        label={ratio.label}
                        onClick={() => handleAspectRatioChange(ratio.value)}
                        variant={aspect === ratio.value ? 'filled' : 'outlined'}
                        color={aspect === ratio.value ? 'primary' : 'default'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Paper>

                {/* Crop Size Mode */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Crop Size Mode
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { value: 'fit', label: 'Fit', description: 'Within image' },
                      { value: 'fill', label: 'Fill', description: 'Use longest side' },
                      { value: 'extend', label: 'Extend', description: 'Beyond frame' },
                    ].map((mode) => (
                      <Chip
                        key={mode.value}
                        label={`${mode.label} - ${mode.description}`}
                        onClick={() => handleCropSizeModeChange(mode.value as 'fit' | 'fill' | 'extend')}
                        variant={cropSizeMode === mode.value ? 'filled' : 'outlined'}
                        color={cropSizeMode === mode.value ? 'secondary' : 'default'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Paper>

                {/* Transform Controls */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Transform
                  </Typography>
                  
                  {/* Rotation */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Rotation: {rotation}°
                    </Typography>
                    <ButtonGroup size="small" sx={{ mb: 1 }}>
                      <Tooltip title="Rotate Left">
                        <Button onClick={() => handleRotationChange('left')}>
                          <RotateLeft />
                        </Button>
                      </Tooltip>
                      <Tooltip title="Rotate Right">
                        <Button onClick={() => handleRotationChange('right')}>
                          <RotateRight />
                        </Button>
                      </Tooltip>
                    </ButtonGroup>
                    <Slider
                      value={rotation}
                      onChange={(_, value) => setRotation(value as number)}
                      min={-180}
                      max={180}
                      step={1}
                      size="small"
                    />
                  </Box>

                  {/* Flip */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Flip
                    </Typography>
                    <ButtonGroup size="small">
                      <Tooltip title="Flip Horizontal">
                        <Button onClick={() => handleFlip('horizontal')}>
                          <Flip />
                        </Button>
                      </Tooltip>
                      <Tooltip title="Flip Vertical">
                        <Button onClick={() => handleFlip('vertical')}>
                          <Flip style={{ transform: 'rotate(90deg)' }} />
                        </Button>
                      </Tooltip>
                    </ButtonGroup>
                  </Box>

                  {/* Zoom */}
                  <Box>
                    <Typography variant="caption" display="block" gutterBottom>
                      Zoom: {(zoom * 100).toFixed(0)}%
                    </Typography>
                    <ButtonGroup size="small" sx={{ mb: 1 }}>
                      <Tooltip title="Zoom Out">
                        <Button onClick={() => handleZoomChange(zoom - 0.1)}>
                          <ZoomOut />
                        </Button>
                      </Tooltip>
                      <Tooltip title="Zoom In">
                        <Button onClick={() => handleZoomChange(zoom + 0.1)}>
                          <ZoomIn />
                        </Button>
                      </Tooltip>
                    </ButtonGroup>
                    <Slider
                      value={zoom}
                      onChange={(_, value) => handleZoomChange(value as number)}
                      min={0.1}
                      max={3}
                      step={0.1}
                      size="small"
                    />
                  </Box>
                </Paper>

                {/* Background */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Background
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backgroundTransparent}
                        onChange={(e) => setBackgroundTransparent(e.target.checked)}
                      />
                    }
                    label="Transparent"
                    sx={{ mb: 1 }}
                  />

                  {!backgroundTransparent && (
                    <Box>
                      <Typography variant="caption" display="block" gutterBottom>
                        Background Color
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {BACKGROUND_COLORS.map((color) => (
                          <Box
                            key={color}
                            onClick={() => setBackgroundColor(color)}
                            sx={{
                              width: 32,
                              height: 32,
                              backgroundColor: color,
                              border: backgroundColor === color ? '3px solid #1976d2' : '1px solid #ccc',
                              borderRadius: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8,
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>

                {/* Grid Settings */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Grid Overlay
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        icon={<GridOff />}
                        checkedIcon={<GridOn />}
                      />
                    }
                    label="Show Grid"
                    sx={{ mb: 2 }}
                  />

                  {showGrid && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Grid Type</InputLabel>
                      <Select
                        value={gridType}
                        label="Grid Type"
                        onChange={(e) => setGridType(e.target.value)}
                      >
                        {GRID_TYPES.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            <Box>
                              <Typography variant="body2" component="div">
                                {type.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" component="div">
                                {type.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Paper>

                {/* Resolution Info & Controls */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2">
                      Resolution
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => setShowResolutionInfo(!showResolutionInfo)}
                    >
                      {showResolutionInfo ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>

                  {showResolutionInfo && (
                    <Box>
                      {/* Original Resolution Info */}
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
                        <Typography variant="caption" color="primary" display="block" fontWeight="bold">
                          📸 Original Image
                        </Typography>
                        <Typography variant="body2">
                          {getOriginalResolution().width} × {getOriginalResolution().height} px
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getOriginalResolution().megapixels} MP
                        </Typography>
                      </Box>

                      {/* Current Crop Resolution */}
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                        <Typography variant="caption" color="success.main" display="block" fontWeight="bold">
                          ✂️ Current Crop
                        </Typography>
                        <Typography variant="body2">
                          {getCurrentCropResolution().width} × {getCurrentCropResolution().height} px
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getCurrentCropResolution().megapixels} MP
                          {completedCrop && (
                            <> • {Math.round((getCurrentCropResolution().width * getCurrentCropResolution().height) / (getOriginalResolution().width * getOriginalResolution().height) * 100)}% of original</>
                          )}
                        </Typography>
                      </Box>

                      {/* Custom Resolution Controls */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customResolution}
                            onChange={(e) => setCustomResolution(e.target.checked)}
                          />
                        }
                        label="Custom Output Resolution"
                        sx={{ mb: 2 }}
                      />

                      {customResolution && (
                        <Box>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                              label="Width"
                              type="number"
                              size="small"
                              value={targetWidth || ''}
                              onChange={(e) => handleResolutionChange('width', e.target.value ? Number(e.target.value) : undefined)}
                              sx={{ flex: 1 }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                              <Typography variant="body2">×</Typography>
                            </Box>
                            <TextField
                              label="Height"
                              type="number"
                              size="small"
                              value={targetHeight || ''}
                              onChange={(e) => handleResolutionChange('height', e.target.value ? Number(e.target.value) : undefined)}
                              sx={{ flex: 1 }}
                            />
                          </Box>

                          <FormControlLabel
                            control={
                              <Switch
                                checked={maintainAspectRatio}
                                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                              />
                            }
                            label="Lock Aspect Ratio"
                            sx={{ mb: 1 }}
                          />

                          {/* Quick Resolution Presets */}
                          <Typography variant="caption" display="block" gutterBottom>
                            Quick Presets:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {[
                              { label: '1K', width: 1024, height: 1024 },
                              { label: '2K', width: 2048, height: 2048 },
                              { label: '4K', width: 4096, height: 4096 },
                              { label: 'HD', width: 1920, height: 1080 },
                              { label: '4K Video', width: 3840, height: 2160 },
                              { label: 'Original', width: getOriginalResolution().width, height: getOriginalResolution().height },
                            ].map((preset) => (
                              <Chip
                                key={preset.label}
                                label={preset.label}
                                size="small"
                                onClick={() => {
                                  if (aspect) {
                                    // Calculate based on aspect ratio
                                    if (aspect >= 1) {
                                      // Landscape/Square
                                      setTargetWidth(preset.width);
                                      setTargetHeight(Math.round(preset.width / aspect));
                                    } else {
                                      // Portrait
                                      setTargetHeight(preset.height);
                                      setTargetWidth(Math.round(preset.height * aspect));
                                    }
                                  } else {
                                    setTargetWidth(preset.width);
                                    setTargetHeight(preset.height);
                                  }
                                }}
                                variant="outlined"
                              />
                            ))}
                          </Box>

                          {/* Target Resolution Preview */}
                          {(targetWidth || targetHeight) && (
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(156, 39, 176, 0.1)', borderRadius: 1 }}>
                              <Typography variant="caption" color="secondary.main" display="block" fontWeight="bold">
                                🎯 Target Output
                              </Typography>
                              <Typography variant="body2">
                                {targetWidth || 'Auto'} × {targetHeight || 'Auto'} px
                              </Typography>
                              {targetWidth && targetHeight && (
                                <Typography variant="caption" color="text.secondary">
                                  {((targetWidth * targetHeight) / 1000000).toFixed(2)} MP
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>

                {/* Reset Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RestartAlt />}
                  onClick={resetSettings}
                  sx={{ mb: 2 }}
                >
                  Reset Settings
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={onClose}
            startIcon={<Cancel />}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            startIcon={<Check />}
            disabled={!completedCrop}
          >
            Apply Crop
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden canvas for processing */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default ImageCropEditor;