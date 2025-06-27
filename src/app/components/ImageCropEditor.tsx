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
  { value: 'golden', label: 'Golden Ratio', description: 'φ (1.618) proportional grid' },
  { value: 'center', label: 'Center Cross', description: 'Center horizontal & vertical lines' },
  { value: 'diagonal', label: 'Diagonal Lines', description: 'Corner-to-corner diagonal guides' },
  { value: 'square4', label: '4×4 Grid', description: 'Square 4×4 grid pattern' },
  { value: 'square6', label: '6×6 Grid', description: 'Fine 6×6 grid pattern' },
  { value: 'square9', label: '9×9 Grid', description: 'Ultra-fine 9×9 grid pattern' },
  { value: 'triangle', label: 'Triangle Grid', description: 'Triangular composition guides' },
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
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image when file changes
  useEffect(() => {
    if (imageFile && open) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        // Reset crop state when new image loads
        setTimeout(() => {
          setCrop({
            unit: '%',
            x: 10,
            y: 10,
            width: 80,
            height: 80,
          });
        }, 100);
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
    }
  }, [open]);

  const handleAspectRatioChange = (value: number | undefined) => {
    setAspect(value);
    setCrop(prevCrop => ({
      ...prevCrop,
      aspect: value,
    }));
  };

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
    setCrop({
      unit: '%',
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });
    setRotation(0);
    setScaleX(1);
    setScaleY(1);
    setZoom(1);
    setAspect(undefined);
    setGridType('thirds');
  };

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop || !canvasRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const scaleFactorX = image.naturalWidth / image.width;
    const scaleFactorY = image.naturalHeight / image.height;

    // Calculate the actual crop dimensions
    const cropX = completedCrop.x * scaleFactorX;
    const cropY = completedCrop.y * scaleFactorY;
    const cropWidth = completedCrop.width * scaleFactorX;
    const cropHeight = completedCrop.height * scaleFactorY;

    // Set canvas size to crop size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background if not transparent
    if (!backgroundTransparent) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Save the context state
    ctx.save();

    // Move to center of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply scale
    ctx.scale(scaleX * zoom, scaleY * zoom);

    // Draw the image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -cropWidth / 2,
      -cropHeight / 2,
      cropWidth,
      cropHeight
    );

    // Restore the context state
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/png',
        1
      );
    });
  }, [completedCrop, rotation, scaleX, scaleY, zoom, backgroundColor, backgroundTransparent]);

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
      strokeDasharray: "2,2"
    };
    
    const fineLineStyle = {
      stroke: "rgba(255,255,255,0.4)",
      strokeWidth: "0.5",
      strokeDasharray: "1,1"
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
            <circle cx="33.33%" cy="33.33%" r="2" fill="rgba(255,255,255,0.8)" />
            <circle cx="66.66%" cy="33.33%" r="2" fill="rgba(255,255,255,0.8)" />
            <circle cx="33.33%" cy="66.66%" r="2" fill="rgba(255,255,255,0.8)" />
            <circle cx="66.66%" cy="66.66%" r="2" fill="rgba(255,255,255,0.8)" />
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
            <circle cx="38.2%" cy="38.2%" r="2" fill="rgba(255,215,0,0.8)" />
            <circle cx="61.8%" cy="38.2%" r="2" fill="rgba(255,215,0,0.8)" />
            <circle cx="38.2%" cy="61.8%" r="2" fill="rgba(255,215,0,0.8)" />
            <circle cx="61.8%" cy="61.8%" r="2" fill="rgba(255,215,0,0.8)" />
          </>
        );

      case 'center':
        return (
          <>
            {/* Center cross */}
            <line x1="50%" y1="0%" x2="50%" y2="100%" {...commonLineStyle} />
            <line x1="0%" y1="50%" x2="100%" y2="50%" {...commonLineStyle} />
            {/* Center point */}
            <circle cx="50%" cy="50%" r="3" fill="rgba(255,255,255,0.8)" stroke="rgba(0,0,0,0.8)" strokeWidth="1" />
          </>
        );

      case 'diagonal':
        return (
          <>
            {/* Diagonal lines */}
            <line x1="0%" y1="0%" x2="100%" y2="100%" {...commonLineStyle} />
            <line x1="100%" y1="0%" x2="0%" y2="100%" {...commonLineStyle} />
            {/* Center intersection */}
            <circle cx="50%" cy="50%" r="2" fill="rgba(255,255,255,0.8)" />
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

      case 'triangle':
        return (
          <>
            {/* Triangle composition lines */}
            <line x1="0%" y1="100%" x2="50%" y2="0%" {...commonLineStyle} />
            <line x1="100%" y1="100%" x2="50%" y2="0%" {...commonLineStyle} />
            <line x1="0%" y1="100%" x2="100%" y2="100%" {...commonLineStyle} />
            {/* Triangle vertices */}
            <circle cx="50%" cy="0%" r="2" fill="rgba(255,255,255,0.8)" />
            <circle cx="0%" cy="100%" r="2" fill="rgba(255,255,255,0.8)" />
            <circle cx="100%" cy="100%" r="2" fill="rgba(255,255,255,0.8)" />
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
              strokeWidth="2"
              strokeDasharray="3,3"
            />
            <circle cx="62.5%" cy="50%" r="2" fill="rgba(255,215,0,0.8)" />
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
            <circle cx="10%" cy="25%" r="1.5" fill="rgba(255,255,255,0.6)" />
            <circle cx="90%" cy="25%" r="1.5" fill="rgba(255,255,255,0.6)" />
            <circle cx="10%" cy="75%" r="1.5" fill="rgba(255,255,255,0.6)" />
            <circle cx="90%" cy="75%" r="1.5" fill="rgba(255,255,255,0.6)" />
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
            <Typography variant="h6">{title}</Typography>
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
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={aspect}
                      keepSelection
                      minWidth={50}
                      minHeight={50}
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
                          // Ensure crop is visible after image loads
                          setTimeout(() => {
                            setCrop(prevCrop => ({
                              unit: '%',
                              x: 10,
                              y: 10,
                              width: 80,
                              height: 80,
                            }));
                          }, 50);
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