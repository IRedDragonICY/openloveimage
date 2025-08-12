'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  Divider,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Close,
  Undo,
  Redo,
  Save,
  RestartAlt,
  Check,
  Cancel,
  // Tools
  PanTool,
  Crop,
  Brush,
  FormatColorFill,
  TextFields,
  Straighten,
  // Transform
  RotateLeft,
  RotateRight,
  Flip,
  ZoomIn,
  ZoomOut,
  FitScreen,
  // Options
  Palette,
  Opacity,
  LineWeight,
  Tune,
  PhotoSizeSelectActual,
  ExpandMore,
  ExpandLess,
  // History
  History,
  Clear,
  // Crop specific
  CropFree,
  AspectRatio,
  GridOn,
  GridOff,
} from '@mui/icons-material';
import ReactCrop, { Crop as ReactCropType, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Types
interface HistoryState {
  id: string;
  name: string;
  imageData: ImageData;
  timestamp: number;
}

interface BrushSettings {
  size: number;
  opacity: number;
  hardness: number;
  color: string;
  blendMode: string;
}

interface TransformSettings {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

interface ResampleSettings {
  algorithm: 'nearest' | 'bilinear' | 'bicubic' | 'bicubic-sharper' | 'bicubic-smoother' | 'reduce-noise';
  preserveDetails: boolean;
  reduceNoise: number;
  sharpenRadius: number;
  sharpenAmount: number;
}

interface CropSettings {
  crop: ReactCropType;
  completedCrop?: PixelCrop;
  aspectRatio?: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  cropZoom: number;
  gridType: string;
  showCropGrid: boolean;
  cropSizeMode: 'fit' | 'fill' | 'extend';
}

type Tool = 'move' | 'crop' | 'brush' | 'eraser' | 'fill' | 'text' | 'eyedropper' | 'clone' | 'heal';

interface ImageEditorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (editedImageBlob: Blob, history: HistoryState[]) => void;
  imageFile: File;
  title?: string;
}

// Constants
const TOOLS = [
  { id: 'move', name: 'Move', icon: <PanTool />, shortcut: 'V' },
  { id: 'crop', name: 'Crop', icon: <Crop />, shortcut: 'C' },
  { id: 'brush', name: 'Brush', icon: <Brush />, shortcut: 'B' },
  { id: 'eraser', name: 'Eraser', icon: <Clear />, shortcut: 'E' },
  { id: 'fill', name: 'Fill', icon: <FormatColorFill />, shortcut: 'G' },
  { id: 'text', name: 'Text', icon: <TextFields />, shortcut: 'T' },
] as const;

const RESAMPLING_ALGORITHMS = [
  { value: 'nearest', label: 'Nearest Neighbor', description: 'Sharp edges, pixelated' },
  { value: 'bilinear', label: 'Bilinear', description: 'Smooth, basic interpolation' },
  { value: 'bicubic', label: 'Bicubic', description: 'High quality, balanced' },
  { value: 'bicubic-sharper', label: 'Bicubic Sharper', description: 'Enhanced detail preservation' },
  { value: 'bicubic-smoother', label: 'Bicubic Smoother', description: 'Reduced aliasing' },
  { value: 'reduce-noise', label: 'Preserve Details', description: 'AI-enhanced quality' },
] as const;

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 
  'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion'
] as const;

const ASPECT_RATIOS = [
  { label: 'Free', value: undefined, icon: <CropFree /> },
  { label: '1:1', value: 1, icon: <AspectRatio /> },
  { label: '4:3', value: 4/3, icon: undefined },
  { label: '3:4', value: 3/4, icon: undefined },
  { label: '16:9', value: 16/9, icon: undefined },
  { label: '9:16', value: 9/16, icon: undefined },
  { label: '3:2', value: 3/2, icon: undefined },
  { label: '2:3', value: 2/3, icon: undefined },
  { label: '5:4', value: 5/4, icon: undefined },
  { label: '4:5', value: 4/5, icon: undefined },
] as const;

  const CROP_SIZE_MODES = [
    { value: 'fit', label: 'Fit', description: 'Crop fits within image bounds' },
    { value: 'fill', label: 'Fill', description: 'Use maximum resolution from longest side' },
    { value: 'extend', label: 'Extend', description: 'Allow crop beyond image boundaries' },
  ] as const;

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
  { value: 'center', label: 'Center Cross', description: 'Center horizontal & vertical lines' },
  { value: 'diagonal', label: 'Diagonal Lines', description: 'Corner-to-corner diagonal guides' },
  { value: 'square4', label: '4×4 Grid', description: 'Square 4×4 grid pattern' },
  { value: 'square6', label: '6×6 Grid', description: 'Fine 6×6 grid pattern' },
] as const;

// Reusable helper to obtain 2D canvas context with read-back optimisation
const CTX_OPTIONS: CanvasRenderingContext2DSettings = { willReadFrequently: true };
const getCtx = (canvas: HTMLCanvasElement | null) => canvas ? canvas.getContext('2d', CTX_OPTIONS) : null;

const ImageEditor: React.FC<ImageEditorProps> = ({
  open,
  onClose,
  onConfirm,
  imageFile,
  title = 'Image Editor',
}) => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Image state
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('move');
  // Use refs instead of state to avoid triggering React re-renders on every mouse move
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // History state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Tool settings
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 20,
    opacity: 100,
    hardness: 80,
    color: '#000000',
    blendMode: 'normal',
  });
  
  const [transformSettings, setTransformSettings] = useState<TransformSettings>({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  });
  
  // Crop-specific state
  const [cropSettings, setCropSettings] = useState<ReactCropType>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [cropAspectRatio, setCropAspectRatio] = useState<number | undefined>(undefined);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropScaleX, setCropScaleX] = useState(1);
  const [cropScaleY, setCropScaleY] = useState(1);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropGridType, setCropGridType] = useState('thirds');
  const [showCropGrid, setShowCropGrid] = useState(true);
  const [cropSizeMode, setCropSizeMode] = useState<'fit' | 'fill' | 'extend'>('fit');
  const [isCropping, setIsCropping] = useState(false);
  
  // Additional crop states for better functionality
  const [cropImageRef, setCropImageRef] = useState<HTMLImageElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [backgroundTransparent, setBackgroundTransparent] = useState(false);
  
  const [resampleSettings, setResampleSettings] = useState<ResampleSettings>({
    algorithm: 'bicubic',
    preserveDetails: true,
    reduceNoise: 50,
    sharpenRadius: 1,
    sharpenAmount: 100,
  });
  
  // UI state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  
  // Image dimensions
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  
  // Canvas sync state for crop mode
  const [canvasImageData, setCanvasImageData] = useState<string | null>(null);

  // Calculate optimal crop based on aspect ratio and mode
  const calculateOptimalCrop = useCallback((targetAspectRatio: number, mode: 'fit' | 'fill' | 'extend') => {
    const img = cropImageRef || originalImage;
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
    setCropSettings(cropPercentage);
    
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
  }, [cropImageRef, originalImage]);

  // Handle aspect ratio change with automatic crop calculation
  const handleAspectRatioChange = useCallback((value: number | undefined) => {
    console.log('🔄 Aspect ratio changing to:', value);
    setCropAspectRatio(value);
    
    if (value && (cropImageRef || originalImage)) {
      // Immediate calculation for responsive UI
      calculateOptimalCrop(value, cropSizeMode);
    } else {
      // Free crop - reset to default
      console.log('🔄 Setting free crop mode');
      setCropSettings({
        unit: '%', x: 10, y: 10, width: 80, height: 80,
      });
      setCompletedCrop(undefined);
    }
  }, [calculateOptimalCrop, cropSizeMode, cropImageRef, originalImage]);

  // Update crop size mode and recalculate
  const handleCropSizeModeChange = useCallback((newMode: 'fit' | 'fill' | 'extend') => {
    console.log('🔄 Crop size mode changing to:', newMode);
    setCropSizeMode(newMode);
    
    // Recalculate crop with new mode if aspect ratio is set
    if (cropAspectRatio && (cropImageRef || originalImage)) {
      calculateOptimalCrop(cropAspectRatio, newMode);
    }
  }, [cropAspectRatio, calculateOptimalCrop, cropImageRef, originalImage]);

  // Helper function to calculate current crop resolution
  const getCurrentCropResolution = () => {
    const img = cropImageRef || originalImage;
    if (!img) {
      return { width: 0, height: 0, megapixels: 0 };
    }

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // Use completedCrop if available, otherwise fall back to crop state
    const activeCrop = completedCrop || cropSettings;
    
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
    const img = cropImageRef || originalImage;
    if (!img) {
      return { width: 0, height: 0, megapixels: 0 };
    }

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const megapixels = (naturalWidth * naturalHeight) / 1000000;

    return { 
      width: naturalWidth, 
      height: naturalHeight, 
      megapixels: Number(megapixels.toFixed(2))
    };
  };

  // Load image when file changes
  useEffect(() => {
    if (imageFile && open) {
      console.log('🔄 Loading image file:', imageFile.name, imageFile.size, 'bytes');
      
      const reader = new FileReader();
      reader.onload = () => {
        console.log('📖 FileReader completed');
        const img = new Image();
        img.onload = () => {
          console.log('🖼️ Image loaded successfully:', img.width, 'x', img.height);
          setOriginalImage(img);
          setImageSrc(reader.result as string);
          setImageWidth(img.width);
          setImageHeight(img.height);
          setCanvasWidth(img.width);
          setCanvasHeight(img.height);
          
                // Initialize canvas with delay to ensure it's rendered
      setTimeout(() => {
        initializeCanvas(img);
        // Update canvas image data after initialization
        setTimeout(() => {
          updateCanvasImageData();
        }, 150);
      }, 100);
        };
        img.onerror = (error) => {
          console.error('❌ Image loading error:', error);
        };
        img.src = reader.result as string;
      };
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
      };
      reader.readAsDataURL(imageFile);
    }
      }, [imageFile, open]);

  // History management
  const addToHistory = useCallback((name: string, imageData: ImageData) => {
    const newState: HistoryState = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      imageData: new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ),
      timestamp: Date.now(),
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => prev + 1);
    setCanUndo(true);
    setCanRedo(false);
  }, [historyIndex]);

  // Initialize canvas with image
  const initializeCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Canvas ref not available for initialization');
      return;
    }
    
    console.log('🎨 Initializing canvas with image:', img.naturalWidth || img.width, 'x', img.naturalHeight || img.height);
    
    // Use natural dimensions for better quality
    const imageWidth = img.naturalWidth || img.width;
    const imageHeight = img.naturalHeight || img.height;
    
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    
    const ctx = getCtx(canvas);
    if (!ctx) {
      console.error('❌ Could not get canvas context during initialization');
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    
    console.log('✅ Canvas initialized successfully with dimensions:', { width: imageWidth, height: imageHeight });
    
    // Update dimension states
    setCanvasWidth(imageWidth);
    setCanvasHeight(imageHeight);
    setImageWidth(imageWidth);
    setImageHeight(imageHeight);
    
    // Save initial state to history only if it's the first initialization
    if (history.length === 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      addToHistory('Initial', imageData);
      console.log('💾 Initial state saved to history');
    }
    
    // Update canvas image data will be called separately
  }, [addToHistory, history.length]);

  // Update canvas image data for crop preview
  const updateCanvasImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    setCanvasImageData(dataUrl);
  }, []);

  // Effect to update canvas image data when canvas changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update canvas image data after any drawing operation
    const updateData = () => {
      setTimeout(updateCanvasImageData, 100); // Small delay to ensure canvas is updated
    };

    canvas.addEventListener('mouseup', updateData);
    return () => canvas.removeEventListener('mouseup', updateData);
  }, [updateCanvasImageData]);

  // Update canvas image data when switching to crop tool
  useEffect(() => {
    if (activeTool === 'crop') {
      console.log('🔄 Switching to crop tool - preparing crop mode');
      
      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        console.log('🎨 Canvas available and ready, updating image data');
        console.log('📐 Canvas dimensions:', { width: canvas.width, height: canvas.height });
        updateCanvasImageData();
      } else if (originalImage) {
        console.log('🖼️ Canvas not ready, initializing with original image');
        initializeCanvas(originalImage);
        updateCanvasImageData();
      } else {
        console.log('⚠️ No canvas or original image available yet');
      }
      
      // Reset crop states when entering crop mode
      setIsCropping(false);
      setCompletedCrop(undefined);
      setCropSettings({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
      setCropAspectRatio(undefined);
      setCropRotation(0);
      setCropScaleX(1);
      setCropScaleY(1);
      setCropZoom(1);
      
      console.log('✅ Crop tool activated - ready for new crop operation');
    }
  }, [activeTool, updateCanvasImageData, originalImage, initializeCanvas]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      
      const canvas = canvasRef.current;
      const ctx = getCtx(canvas);
      
      if (canvas && ctx && prevState) {
        ctx.putImageData(prevState.imageData, 0, 0);
        setHistoryIndex(prevIndex);
        setCanUndo(prevIndex > 0);
        setCanRedo(true);
        
        // Update canvas image data for crop preview
        updateCanvasImageData();
      }
    }
  }, [history, historyIndex, updateCanvasImageData]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      
      const canvas = canvasRef.current;
      const ctx = getCtx(canvas);
      
      if (canvas && ctx && nextState) {
        ctx.putImageData(nextState.imageData, 0, 0);
        setHistoryIndex(nextIndex);
        setCanRedo(nextIndex < history.length - 1);
        setCanUndo(true);
        
        // Update canvas image data for crop preview
        updateCanvasImageData();
      }
    }
  }, [history, historyIndex, updateCanvasImageData]);

  // Utility to convert mouse coordinates to canvas coordinates accounting for CSS transforms
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor between rendered size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;

    isDrawingRef.current = true;

    const { x, y } = getCanvasCoords(e);
    lastPointRef.current = { x, y };
  }, [activeTool, getCanvasCoords]);

  const drawDot = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, brushSettings.size / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = getCtx(canvas);
    if (!canvas || !ctx) return;

    const { x: currX, y: currY } = getCanvasCoords(e);

    ctx.save();

    // Configure brush style
    ctx.globalAlpha = brushSettings.opacity / 100;
    ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = brushSettings.color;

    // For soft brushes create RGBA radial gradient per dot
    const useSoftBrush = brushSettings.hardness < 100 && activeTool === 'brush';

    const drawSoftDot = (x: number, y: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSettings.size / 2);
      const r = parseInt(brushSettings.color.slice(1, 3), 16);
      const g = parseInt(brushSettings.color.slice(3, 5), 16);
      const b = parseInt(brushSettings.color.slice(5, 7), 16);
      const alpha = brushSettings.opacity / 100;

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(brushSettings.hardness / 100, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      drawDot(ctx, x, y);
    };

    // Interpolate points between last and current position for smooth line
    const dx = currX - lastPointRef.current.x;
    const dy = currY - lastPointRef.current.y;
    const distance = Math.hypot(dx, dy);
    const step = brushSettings.size * 0.4; // spacing factor
    const steps = Math.max(1, Math.floor(distance / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lastPointRef.current.x + dx * t;
      const y = lastPointRef.current.y + dy * t;
      if (useSoftBrush) {
        drawSoftDot(x, y);
      } else {
        ctx.fillStyle = brushSettings.color;
        drawDot(ctx, x, y);
      }
    }

    ctx.restore();

    lastPointRef.current = { x: currX, y: currY };
  }, [brushSettings, activeTool, getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      
      // Add to history
      const canvas = canvasRef.current;
      const ctx = getCtx(canvas);
      if (canvas && ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        addToHistory(`${activeTool === 'brush' ? 'Brush' : 'Eraser'} Stroke`, imageData);
        
        // Update canvas image data for crop preview
        updateCanvasImageData();
      }
    }
  }, [isDrawingRef, activeTool, addToHistory, updateCanvasImageData]);

  // Enhanced crop functionality that works with both original and edited images
  const applyCrop = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('❌ applyCrop failed: Canvas reference is not available.');
      return;
    }
    if (!completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      console.warn('⚠️ applyCrop warning: No valid crop selection to apply.');
      return;
    }
    if (!canvasImageData) {
      console.error('❌ applyCrop failed: No canvas image data source.');
      return;
    }

    console.log('🚀 Starting robust crop application...');
    
    // Create a new Image element from the data URL the user was cropping.
    // This ensures we crop exactly what the user saw.
    const imageToCrop = new Image();
    imageToCrop.onload = () => {
      console.log('🖼️ Image source for cropping has loaded.');

      const ctx = getCtx(canvas);
      if (!ctx) {
        console.error('❌ Could not get canvas context for cropping.');
        return;
      }
      
      // Calculate final crop dimensions. `completedCrop` is in pixels of the displayed image.
      const { x, y, width, height } = completedCrop;
      const cropWidth = Math.round(width);
      const cropHeight = Math.round(height);

      console.log('📐 Final dimensions:', { cropWidth, cropHeight });
      
      // Resize the main canvas to the new dimensions.
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      // Clear canvas and set background color.
      ctx.clearRect(0, 0, cropWidth, cropHeight);
      if (!backgroundTransparent) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, cropWidth, cropHeight);
      }
      
      // Apply transformations (rotation, flip)
      ctx.save();
      ctx.translate(cropWidth / 2, cropHeight / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropScaleX, cropScaleY);
      
      // Draw the cropped portion from our source image onto the main canvas.
      ctx.drawImage(
        imageToCrop,
        x, y, width, height, // Source rectangle from the loaded image
        -cropWidth / 2, -cropHeight / 2, cropWidth, cropHeight // Destination rectangle on the canvas
      );
      ctx.restore();
      
      console.log('✅ Crop drawn to main canvas.');

      // Update state to reflect the changes
      setCanvasWidth(cropWidth);
      setCanvasHeight(cropHeight);
      setImageWidth(cropWidth);
      setImageHeight(cropHeight);
      
      const newImageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
      addToHistory('Crop Applied', newImageData);
      
      // CRITICAL: Update the image data URL from the now-modified canvas
      const newDataUrl = canvas.toDataURL('image/png');
      setCanvasImageData(newDataUrl);
      console.log('🔄 Canvas image data state has been updated.');

      // Reset all crop-related states and switch tool
      setIsCropping(false);
      setCompletedCrop(undefined);
      setCropSettings({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
      setCropAspectRatio(undefined);
      setCropRotation(0);
      setCropScaleX(1);
      setCropScaleY(1);
      setActiveTool('move');
      
      console.log('✅ Crop applied successfully. Switched to move tool.');
    };
    
    imageToCrop.onerror = () => {
      console.error('❌ Failed to load image source for cropping.');
    };
    
    // Set the source to start loading
    imageToCrop.src = canvasImageData;

  }, [
    completedCrop, 
    canvasImageData,
    addToHistory, 
    cropRotation, 
    cropScaleX, 
    cropScaleY, 
    backgroundColor, 
    backgroundTransparent
  ]);

  const renderCropGridLines = () => {
    const commonLineStyle = {
      stroke: "rgba(255,255,255,0.8)",
      strokeWidth: "1",
      strokeDasharray: "2,2",
      vectorEffect: "non-scaling-stroke"
    };

    switch (cropGridType) {
      case 'thirds':
        return (
          <>
            <line x1="33.33%" y1="0%" x2="33.33%" y2="100%" {...commonLineStyle} />
            <line x1="66.66%" y1="0%" x2="66.66%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="33.33%" x2="100%" y2="33.33%" {...commonLineStyle} />
            <line x1="0%" y1="66.66%" x2="100%" y2="66.66%" {...commonLineStyle} />
            <circle cx="33.33%" cy="33.33%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="66.66%" cy="33.33%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="33.33%" cy="66.66%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
            <circle cx="66.66%" cy="66.66%" r="2" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
          </>
        );
      case 'center':
        return (
          <>
            <line x1="50%" y1="0%" x2="50%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="50%" x2="100%" y2="50%" {...commonLineStyle} />
            <circle cx="50%" cy="50%" r="3" fill="rgba(255,255,255,0.8)" vectorEffect="non-scaling-stroke" />
          </>
        );
      case 'diagonal':
        return (
          <>
            <line x1="0%" y1="0%" x2="100%" y2="100%" {...commonLineStyle} />
            <line x1="100%" y1="0%" x2="0%" y2="100%" {...commonLineStyle} />
          </>
        );
      default:
        return null;
    }
  };

  // Resize image with resampling
  const resizeImage = useCallback((newWidth: number, newHeight: number) => {
    const canvas = canvasRef.current;
    const ctx = getCtx(canvas);
    if (!canvas || !ctx) return;
    
    // Get current image data
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Create temporary canvas for resampling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.putImageData(currentImageData, 0, 0);
    
    // Resize main canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Apply resampling algorithm
    ctx.imageSmoothingEnabled = resampleSettings.algorithm !== 'nearest';
    
    switch (resampleSettings.algorithm) {
      case 'nearest':
        ctx.imageSmoothingEnabled = false;
        break;
      case 'bilinear':
        ctx.imageSmoothingQuality = 'low';
        break;
      case 'bicubic':
        ctx.imageSmoothingQuality = 'high';
        break;
      case 'bicubic-sharper':
        ctx.imageSmoothingQuality = 'high';
        // Additional sharpening would be applied here
        break;
      case 'bicubic-smoother':
        ctx.imageSmoothingQuality = 'medium';
        break;
      case 'reduce-noise':
        ctx.imageSmoothingQuality = 'high';
        // Noise reduction algorithm would be applied here
        break;
    }
    
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    
    // Update dimensions
    setCanvasWidth(newWidth);
    setCanvasHeight(newHeight);
    
    // Add to history
    const newImageData = ctx.getImageData(0, 0, newWidth, newHeight);
    addToHistory('Resize Image', newImageData);
    
    // Update canvas image data for crop preview
    updateCanvasImageData();
  }, [resampleSettings, addToHistory, updateCanvasImageData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
      } else {
        // Tool shortcuts
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('move');
            break;
          case 'c':
            setActiveTool('crop');
            break;
          case 'b':
            setActiveTool('brush');
            break;
          case 'e':
            setActiveTool('eraser');
            break;
          case 'g':
            setActiveTool('fill');
            break;
          case 't':
            setActiveTool('text');
            break;
        }
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, undo, redo]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setHistory([]);
      setHistoryIndex(-1);
      setCanUndo(false);
      setCanRedo(false);
      setActiveTool('brush'); // Start with brush tool
      setZoom(1);
      setPanX(0);
      setPanY(0);
      
      // Reset crop settings
      setCropSettings({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
      setCompletedCrop(undefined);
      setCropAspectRatio(undefined);
      setCropRotation(0);
      setCropScaleX(1);
      setCropScaleY(1);
      setCropZoom(1);
      setCropGridType('thirds');
      setShowCropGrid(true);
      setCropSizeMode('fit');
      setIsCropping(false);
      setBackgroundColor('#FFFFFF');
      setBackgroundTransparent(false);
      setCropImageRef(null);
      
      console.log('🔄 Dialog opened - all settings reset');
    }
  }, [open]);

  // Generate final image
  const getFinalImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1);
    });
  }, []);

  const handleConfirm = async () => {
    const finalImageBlob = await getFinalImage();
    if (finalImageBlob) {
      onConfirm(finalImageBlob, history);
    }
    onClose();
  };

  // Render tool options based on active tool
  const renderToolOptions = () => {
    switch (activeTool) {
      case 'brush':
      case 'eraser':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LineWeight fontSize="small" />
              <Typography variant="caption">Size:</Typography>
              <Slider
                value={brushSettings.size}
                onChange={(_, value) => setBrushSettings(prev => ({ ...prev, size: value as number }))}
                min={1}
                max={200}
                sx={{ width: 120 }}
                size="small"
              />
              <Typography variant="caption" sx={{ minWidth: 30 }}>
                {brushSettings.size}px
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Opacity fontSize="small" />
              <Typography variant="caption">Opacity:</Typography>
              <Slider
                value={brushSettings.opacity}
                onChange={(_, value) => setBrushSettings(prev => ({ ...prev, opacity: value as number }))}
                min={1}
                max={100}
                sx={{ width: 120 }}
                size="small"
              />
              <Typography variant="caption" sx={{ minWidth: 30 }}>
                {brushSettings.opacity}%
              </Typography>
            </Box>
            
            {activeTool === 'brush' && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption">Hardness:</Typography>
                  <Slider
                    value={brushSettings.hardness}
                    onChange={(_, value) => setBrushSettings(prev => ({ ...prev, hardness: value as number }))}
                    min={0}
                    max={100}
                    sx={{ width: 120 }}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ minWidth: 30 }}>
                    {brushSettings.hardness}%
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Palette fontSize="small" />
                  <input
                    type="color"
                    value={brushSettings.color}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, color: e.target.value }))}
                    style={{ width: 40, height: 30, border: 'none', borderRadius: 4 }}
                  />
                </Box>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Blend Mode</InputLabel>
                  <Select
                    value={brushSettings.blendMode}
                    label="Blend Mode"
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, blendMode: e.target.value }))}
                  >
                    {BLEND_MODES.map(mode => (
                      <MenuItem key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        );
        
      case 'crop':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, flexWrap: 'wrap' }}>
            {/* Aspect Ratios */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption">Aspect:</Typography>
              {ASPECT_RATIOS.slice(0, 6).map(ratio => (
                <Chip
                  key={ratio.label}
                  label={ratio.label}
                  size="small"
                  onClick={() => handleAspectRatioChange(ratio.value)}
                  variant={cropAspectRatio === ratio.value ? 'filled' : 'outlined'}
                  color={cropAspectRatio === ratio.value ? 'primary' : 'default'}
                />
              ))}
            </Box>
            
            {/* Crop Size Mode */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption">Mode:</Typography>
              {CROP_SIZE_MODES.map(mode => (
                <Chip
                  key={mode.value}
                  label={mode.label}
                  size="small"
                  onClick={() => handleCropSizeModeChange(mode.value)}
                  variant={cropSizeMode === mode.value ? 'filled' : 'outlined'}
                  color={cropSizeMode === mode.value ? 'secondary' : 'default'}
                />
              ))}
            </Box>

            {/* Transform Controls */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption">Transform:</Typography>
              <ButtonGroup size="small">
                <Tooltip title="Rotate Left">
                  <Button onClick={() => setCropRotation(prev => prev - 90)}>
                    <RotateLeft fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Rotate Right">
                  <Button onClick={() => setCropRotation(prev => prev + 90)}>
                    <RotateRight fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Flip Horizontal">
                  <Button onClick={() => setCropScaleX(prev => prev * -1)}>
                    <Flip fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Flip Vertical">
                  <Button onClick={() => setCropScaleY(prev => prev * -1)}>
                    <Flip style={{ transform: 'rotate(90deg)' }} fontSize="small" />
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>

            {/* Grid Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={showCropGrid}
                  onChange={(e) => setShowCropGrid(e.target.checked)}
                  size="small"
                />
              }
              label="Grid"
            />

            {/* Apply/Cancel Crop */}
            {isCropping && (
              <ButtonGroup size="small">
                <Button onClick={() => {
                  console.log('❌ Cancel crop clicked');
                  setIsCropping(false);
                }} color="inherit">
                  <Cancel fontSize="small" />
                </Button>
                <Button onClick={() => {
                  console.log('✅ Apply crop toolbar button clicked!');
                  console.log('📋 Current completedCrop:', completedCrop);
                  console.log('📋 Current crop settings:', cropSettings);
                  console.log('📋 Canvas available:', !!canvasRef.current);
                  console.log('📋 Original image available:', !!originalImage);
                  console.log('📋 Crop image ref available:', !!cropImageRef);
                  
                  if (!completedCrop) {
                    console.warn('⚠️ No completed crop available');
                    return;
                  }
                  
                  applyCrop();
                }} color="primary">
                  <Check fontSize="small" />
                </Button>
              </ButtonGroup>
            )}
          </Box>
        );
        
      default:
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Select a tool to see options
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: '95vw',
          height: '95vh',
          maxWidth: 'none',
          maxHeight: 'none',
        },
      }}
    >
      <DialogTitle sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {(cropImageRef || originalImage) && (
              <Typography variant="caption" color="text.secondary">
                📸 {getOriginalResolution().width} × {getOriginalResolution().height} 
                {completedCrop && (
                  <> → ✂️ {getCurrentCropResolution().width} × {getCurrentCropResolution().height}</>
                )}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {canvasWidth} × {canvasHeight} px
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* Options Bar */}
      <AppBar position="static" color="default" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {/* History Controls */}
            <ButtonGroup size="small">
              <Tooltip title="Undo (Ctrl+Z)">
                <span>
                  <Button disabled={!canUndo} onClick={undo}>
                    <Undo fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Redo (Ctrl+Y)">
                <span>
                  <Button disabled={!canRedo} onClick={redo}>
                    <Redo fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            </ButtonGroup>
            
            <Divider orientation="vertical" flexItem />
            
            {/* Tool Options */}
            {renderToolOptions()}
            
            <Box sx={{ flex: 1 }} />
            
            {/* Zoom Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ButtonGroup size="small">
                <Button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.2))}>
                  <ZoomOut fontSize="small" />
                </Button>
                <Button onClick={() => setZoom(1)}>
                  <FitScreen fontSize="small" />
                </Button>
                <Button onClick={() => setZoom(prev => Math.min(5, prev + 0.2))}>
                  <ZoomIn fontSize="small" />
                </Button>
              </ButtonGroup>
              <Typography variant="caption" sx={{ minWidth: 40 }}>
                {Math.round(zoom * 100)}%
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <DialogContent sx={{ p: 0, display: 'flex', height: 'calc(100% - 120px)' }}>
        {/* Tools Sidebar */}
        <Box sx={{ width: 80, backgroundColor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 1 }}>
            {TOOLS.map((tool) => (
              <Tooltip key={tool.id} title={`${tool.name} (${tool.shortcut})`} placement="right">
                <IconButton
                  onClick={() => {
                    console.log(`🔧 Switching to tool: ${tool.id}`);
                    setActiveTool(tool.id as Tool);
                  }}
                  sx={{
                    width: '100%',
                    height: 60,
                    mb: 0.5,
                    backgroundColor: activeTool === tool.id ? 'primary.main' : 'transparent',
                    color: activeTool === tool.id ? 'primary.contrastText' : 'text.primary',
                    '&:hover': {
                      backgroundColor: activeTool === tool.id ? 'primary.dark' : 'action.hover',
                    },
                    flexDirection: 'column',
                    fontSize: '0.75rem',
                  }}
                >
                  {tool.icon}
                  <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
                    {tool.shortcut}
                  </Typography>
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Canvas Area */}
        <Box 
          sx={{ 
            flex: 1, 
            position: 'relative', 
            overflow: 'auto', 
            backgroundColor: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageSrc && (
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              
              {/* Canvas for drawing - ALWAYS MOUNTED */}
              <canvas
                ref={canvasRef}
                onMouseDown={activeTool === 'crop' ? undefined : startDrawing}
                onMouseMove={activeTool === 'crop' ? undefined : draw}
                onMouseUp={activeTool === 'crop' ? undefined : stopDrawing}
                onMouseLeave={activeTool === 'crop' ? undefined : stopDrawing}
                style={{
                  visibility: activeTool === 'crop' ? 'hidden' : 'visible',
                  position: activeTool === 'crop' ? 'absolute' : 'relative',
                  border: '2px solid #666',
                  borderRadius: '4px',
                  cursor: activeTool === 'brush' || activeTool === 'eraser' ? 'crosshair' : 
                          activeTool === 'move' ? 'grab' : 'default',
                  transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                  transformOrigin: 'center',
                  maxWidth: 'calc(100vw - 600px)',
                  maxHeight: 'calc(100vh - 300px)',
                  backgroundColor: 'white',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                }}
              />
              
              {/* Grid overlay for non-crop tools */}
              {showGrid && activeTool !== 'crop' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                    transformOrigin: 'center',
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
                    pointerEvents: 'none',
                    borderRadius: '4px',
                  }}
                />
              )}
              
              {/* Crop UI - shown only during crop */}
              {activeTool === 'crop' && canvasImageData && (
                <ReactCrop
                  crop={cropSettings}
                  onChange={(_, percentCrop) => {
                    setCropSettings(percentCrop);
                    setIsCropping(true);
                  }}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={cropAspectRatio}
                  keepSelection
                  minWidth={50}
                  minHeight={50}
                  ruleOfThirds={showCropGrid && cropGridType === 'thirds'}
                >
                  <img
                    ref={setCropImageRef}
                    src={canvasImageData}
                    alt="Crop preview"
                    style={{
                      maxWidth: 'calc(100vw - 600px)',
                      maxHeight: 'calc(100vh - 300px)',
                      transform: `rotate(${cropRotation}deg) scaleX(${cropScaleX}) scaleY(${cropScaleY}) scale(${zoom}) translate(${panX}px, ${panY}px)`,
                      transformOrigin: 'center',
                      display: 'block',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                      border: '2px solid #666',
                      borderRadius: '4px',
                      backgroundImage: backgroundTransparent 
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                      backgroundSize: backgroundTransparent ? '20px 20px' : undefined,
                      backgroundPosition: backgroundTransparent ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
                    }}
                    onLoad={() => {
                      if (cropAspectRatio) {
                        calculateOptimalCrop(cropAspectRatio, cropSizeMode);
                      }
                    }}
                  />
                </ReactCrop>
              )}
            </Box>
          )}
          
          {!imageSrc && (
            <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="h6" gutterBottom>
                Loading image...
              </Typography>
              <Typography variant="body2">
                Please wait while the image is being prepared for editing.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Properties Panel */}
        <Box sx={{ width: 300, backgroundColor: 'background.paper', borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}>
          <Box sx={{ p: 2 }}>
            {/* Crop Settings - Only show when crop tool is active */}
            {activeTool === 'crop' && (
              <Accordion expanded={true}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Crop fontSize="small" />
                    <Typography variant="subtitle2">Crop Settings</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Aspect Ratios */}
                    <Box>
                      <Typography variant="caption" gutterBottom>Aspect Ratio</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {ASPECT_RATIOS.map((ratio) => (
                          <Chip
                            key={ratio.label}
                            label={ratio.label}
                            size="small"
                            onClick={() => handleAspectRatioChange(ratio.value)}
                            variant={cropAspectRatio === ratio.value ? 'filled' : 'outlined'}
                            color={cropAspectRatio === ratio.value ? 'primary' : 'default'}
                            {...(ratio.icon ? { icon: ratio.icon } : {})}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Crop Size Mode */}
                    <Box>
                      <Typography variant="caption" gutterBottom>Crop Mode</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {CROP_SIZE_MODES.map((mode) => (
                          <Chip
                            key={mode.value}
                            label={`${mode.label} - ${mode.description}`}
                            size="small"
                            onClick={() => handleCropSizeModeChange(mode.value)}
                            variant={cropSizeMode === mode.value ? 'filled' : 'outlined'}
                            color={cropSizeMode === mode.value ? 'secondary' : 'default'}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Grid Settings */}
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showCropGrid}
                            onChange={(e) => setShowCropGrid(e.target.checked)}
                            icon={<GridOff />}
                            checkedIcon={<GridOn />}
                          />
                        }
                        label="Show Grid"
                      />
                      
                      {showCropGrid && (
                        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                          <InputLabel>Grid Type</InputLabel>
                          <Select
                            value={cropGridType}
                            label="Grid Type"
                            onChange={(e) => setCropGridType(e.target.value)}
                          >
                            {GRID_TYPES.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                <Box>
                                  <Typography variant="body2">{type.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {type.description}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Box>

                    {/* Background Settings */}
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={backgroundTransparent}
                            onChange={(e) => {
                              setBackgroundTransparent(e.target.checked);
                              console.log('🔲 Background transparency toggled to:', e.target.checked);
                            }}
                          />
                        }
                        label="Transparent Background"
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
                                onClick={() => {
                                  setBackgroundColor(color);
                                  console.log('🎨 Background color changed to:', color);
                                }}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  backgroundColor: color,
                                  border: backgroundColor === color ? '2px solid #1976d2' : '1px solid #ccc',
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
                    </Box>

                    {/* Resolution Info */}
                    <Box>
                      {/* Original Resolution Info */}
                      <Box sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
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
                      {completedCrop && (
                        <Box sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                          <Typography variant="caption" color="success.main" display="block" fontWeight="bold">
                            ✂️ Current Crop
                          </Typography>
                          <Typography variant="body2">
                            {getCurrentCropResolution().width} × {getCurrentCropResolution().height} px
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getCurrentCropResolution().megapixels} MP
                            {getOriginalResolution().width > 0 && (
                              <> • {Math.round((getCurrentCropResolution().width * getCurrentCropResolution().height) / (getOriginalResolution().width * getOriginalResolution().height) * 100)}% of original</>
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Apply/Reset Buttons */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => {
                          setIsCropping(false);
                          setCompletedCrop(undefined);
                          setCropSettings({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
                          setCropAspectRatio(undefined);
                          setCropRotation(0);
                          setCropScaleX(1);
                          setCropScaleY(1);
                          setCropSizeMode('fit');
                          setBackgroundColor('#FFFFFF');
                          setBackgroundTransparent(false);
                          console.log('🔄 Crop settings reset to default');
                        }}
                        startIcon={<RestartAlt />}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        onClick={() => {
                          console.log('🔥 Apply crop button clicked!');
                          console.log('📋 Current completedCrop:', completedCrop);
                          console.log('📋 Current crop settings:', cropSettings);
                          console.log('📋 Canvas available:', !!canvasRef.current);
                          console.log('📋 Original image available:', !!originalImage);
                          console.log('📋 Crop image ref available:', !!cropImageRef);
                          
                          if (!completedCrop) {
                            console.warn('⚠️ No completed crop available');
                            return;
                          }
                          
                          applyCrop();
                        }}
                        disabled={!completedCrop}
                        startIcon={<Check />}
                      >
                        Apply
                      </Button>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Image Size */}
            <Accordion expanded={activeTool !== 'crop'}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhotoSizeSelectActual fontSize="small" />
                  <Typography variant="subtitle2">Image Size</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      label="Width"
                      type="number"
                      size="small"
                      value={canvasWidth}
                      onChange={(e) => setCanvasWidth(Number(e.target.value))}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Height"
                      type="number"
                      size="small"
                      value={canvasHeight}
                      onChange={(e) => setCanvasHeight(Number(e.target.value))}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  
                  <FormControl fullWidth size="small">
                    <InputLabel>Resample</InputLabel>
                    <Select
                      value={resampleSettings.algorithm}
                      label="Resample"
                      onChange={(e) => setResampleSettings(prev => ({ 
                        ...prev, 
                        algorithm: e.target.value as ResampleSettings['algorithm'] 
                      }))}
                    >
                      {RESAMPLING_ALGORITHMS.map(algo => (
                        <MenuItem key={algo.value} value={algo.value}>
                          <Box>
                            <Typography variant="body2">{algo.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {algo.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => resizeImage(canvasWidth, canvasHeight)}
                    disabled={canvasWidth === imageWidth && canvasHeight === imageHeight}
                  >
                    Apply Resize
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* History Panel */}
            <Accordion expanded={false}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History fontSize="small" />
                  <Typography variant="subtitle2">History</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {history.map((state, index) => (
                    <Box
                      key={state.id}
                      sx={{
                        p: 1,
                        mb: 0.5,
                        backgroundColor: index === historyIndex ? 'primary.main' : 'transparent',
                        color: index === historyIndex ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: index === historyIndex ? 'primary.dark' : 'action.hover',
                        },
                      }}
                      onClick={() => {
                        const canvas = canvasRef.current;
                        const ctx = getCtx(canvas);
                        if (canvas && ctx) {
                          ctx.putImageData(state.imageData, 0, 0);
                          setHistoryIndex(index);
                          setCanUndo(index > 0);
                          setCanRedo(index < history.length - 1);
                          
                          // Update canvas image data for crop preview
                          updateCanvasImageData();
                        }
                      }}
                    >
                      <Typography variant="caption">{state.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* View Options */}
            <Accordion expanded={false}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tune fontSize="small" />
                  <Typography variant="subtitle2">View</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                      />
                    }
                    label="Show Grid"
                  />
                  
                  {showGrid && (
                    <Box>
                      <Typography variant="caption" gutterBottom>
                        Grid Size: {gridSize}px
                      </Typography>
                      <Slider
                        value={gridSize}
                        onChange={(_, value) => setGridSize(value as number)}
                        min={10}
                        max={100}
                        step={5}
                        size="small"
                      />
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} startIcon={<Cancel />}>
          Cancel
        </Button>
        <Button onClick={() => {
          // Reset to original
          if (originalImage) {
            initializeCanvas(originalImage);
          }
        }} startIcon={<RestartAlt />}>
          Reset
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<Check />}
        >
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageEditor; 