'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Button,
  Slider,
} from '@mui/material';
import {
  Close,
  Download,
  Info,
  SwapHoriz,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { heicTo, isHeic } from 'heic-to';

interface BeforeAfterPreviewProps {
  originalFile: File;
  convertedFile: Blob;
  fileName: string;
  open: boolean;
  onClose: () => void;
  outputFormat: string;
  originalSize: number;
  convertedSize: number;
}

const BeforeAfterPreview = ({ 
  originalFile,
  convertedFile,
  fileName,
  open,
  onClose,
  outputFormat,
  originalSize,
  convertedSize
}: BeforeAfterPreviewProps) => {
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [convertedImageUrl, setConvertedImageUrl] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [imageInfo, setImageInfo] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'comparison' | 'sideBySide'>('comparison');
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Reset zoom when dialog opens/closes
  useEffect(() => {
    if (open) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      setIsPanning(false);
      setIsDragging(false);
    }
  }, [open]);

  // Load images when dialog opens
  useEffect(() => {
    if (open && originalFile && convertedFile) {
      setIsLoading(true);
      setError('');

      const loadImages = async () => {
        try {
          let originalUrl: string;
          let convertedUrl: string;

          // Handle original file (might be HEIC)
          const isOriginalHeic = await isHeic(originalFile);
          if (isOriginalHeic) {
            try {
              const convertedOriginal = await heicTo({
                blob: originalFile,
                type: 'image/jpeg',
                quality: 0.9
              });
              originalUrl = URL.createObjectURL(convertedOriginal);
            } catch (heicError) {
              console.error('HEIC conversion failed:', heicError);
              setError('Failed to convert HEIC file for preview');
              setIsLoading(false);
              return;
            }
          } else {
            originalUrl = URL.createObjectURL(originalFile);
          }

          // Handle converted file (should already be in supported format)
          convertedUrl = URL.createObjectURL(convertedFile);

          setOriginalImageUrl(originalUrl);
          setConvertedImageUrl(convertedUrl);

          // Get image dimensions from converted file (more reliable)
          const img = new Image();
          img.onload = () => {
            setImageInfo({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
            setIsLoading(false);
          };
          img.onerror = () => {
            setError('Failed to load converted image');
            setIsLoading(false);
          };
          img.src = convertedUrl;

          return () => {
            URL.revokeObjectURL(originalUrl);
            URL.revokeObjectURL(convertedUrl);
          };
        } catch (error) {
          console.error('Error loading images:', error);
          setError('Failed to load images');
          setIsLoading(false);
        }
      };

      loadImages();
    }
  }, [open, originalFile, convertedFile]);

  // Handle mouse events for slider
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom and Pan handlers
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
    setZoomLevel(newZoom);
    
    if (newZoom === 1) {
      setPanPosition({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 1 && !isDragging) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [zoomLevel, isDragging]);

  const handlePanMove = useCallback((e: MouseEvent) => {
    if (isPanning && zoomLevel > 1) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPanPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint, zoomLevel]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const zoomIn = () => {
    const newZoom = Math.min(5, zoomLevel + 0.25);
    setZoomLevel(newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(0.5, zoomLevel - 0.25);
    setZoomLevel(newZoom);
    if (newZoom === 1) {
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Add event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Add pan event listeners
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);

      return () => {
        document.removeEventListener('mousemove', handlePanMove);
        document.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Add wheel event listener for zoom
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSavingsPercentage = (): string => {
    const savings = ((originalSize - convertedSize) / originalSize) * 100;
    return savings > 0 ? `-${savings.toFixed(1)}%` : `+${Math.abs(savings).toFixed(1)}%`;
  };

  const handleDownload = () => {
    const fileExtension = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const downloadFileName = fileName.replace(/\.[^/.]+$/, '') + '.' + fileExtension;
    saveAs(convertedFile, downloadFileName);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          height: fullScreen ? '100vh' : 'auto',
          borderRadius: fullScreen ? 0 : 3,
          boxShadow: theme.shadows[24],
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        py: 2,
        px: 3,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.default',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 500,
              fontSize: '1.1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.primary'
            }}
          >
            Image Comparison
          </Typography>
          <Chip 
            label={outputFormat.toUpperCase()} 
            color="success" 
            size="small" 
            variant="filled"
            sx={{ 
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24
            }}
          />
        </Box>
        
        <Stack direction="row" spacing={1}>
          <IconButton 
            onClick={() => setViewMode(viewMode === 'comparison' ? 'sideBySide' : 'comparison')}
            color="primary"
            title={viewMode === 'comparison' ? 'Switch to Side by Side' : 'Switch to Comparison'}
            sx={{
              bgcolor: 'action.hover',
              '&:hover': {
                bgcolor: 'action.selected',
              }
            }}
          >
            <SwapHoriz />
          </IconButton>
          <IconButton 
            onClick={handleDownload} 
            color="primary"
            title="Download converted image"
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            <Download />
          </IconButton>
          <IconButton 
            onClick={onClose}
            title="Close"
            sx={{
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {isLoading && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: { xs: 400, md: 500 },
            flexDirection: 'column',
            gap: 3,
            p: 4
          }}>
            <CircularProgress 
              size={48} 
              thickness={4}
              sx={{ color: 'primary.main' }}
            />
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Loading images for comparison...
            </Typography>
            <Typography 
              variant="body2" 
              color="text.disabled"
              sx={{ textAlign: 'center', maxWidth: 300 }}
            >
              Processing HEIC files may take a moment
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: { xs: 400, md: 500 },
            flexDirection: 'column',
            gap: 3,
            p: 4
          }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1
              }}
            >
              <Typography variant="h4" sx={{ color: 'error.main' }}>
                ⚠️
              </Typography>
            </Box>
            <Typography 
              variant="h6" 
              color="error.main"
              sx={{ fontWeight: 500, textAlign: 'center' }}
            >
              Failed to Load Images
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ textAlign: 'center', maxWidth: 400 }}
            >
              {error}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={onClose}
              sx={{ mt: 2 }}
            >
              Close and Try Again
            </Button>
          </Box>
        )}

        {!isLoading && !error && originalImageUrl && convertedImageUrl && (
          <Box>
            {/* Image Comparison Container */}
            <Box sx={{ 
              position: 'relative',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              minHeight: { xs: 450, md: 650 },
              overflow: 'hidden',
              borderRadius: 0,
              backgroundImage: `radial-gradient(circle at 25px 25px, ${theme.palette.divider} 2px, transparent 0), radial-gradient(circle at 75px 75px, ${theme.palette.divider} 2px, transparent 0)`,
              backgroundSize: '100px 100px',
              backgroundPosition: '0 0, 50px 50px',
            }}>
              {viewMode === 'comparison' ? (
                // Slider Comparison View
                <Box
                  ref={containerRef}
                  onMouseDown={zoomLevel > 1 ? handlePanStart : undefined}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: { xs: 450, md: 650 },
                    cursor: zoomLevel > 1 
                      ? (isPanning ? 'grabbing' : 'grab')
                      : (isDragging ? 'grabbing' : 'grab'),
                    userSelect: 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Original Image (Background) */}
                  <Box
                    component="img"
                    src={originalImageUrl}
                    alt="Original"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                      transformOrigin: 'center center',
                      transition: isZooming ? 'none' : 'transform 0.1s ease-out',
                    }}
                  />

                  {/* Converted Image (Foreground with clip) */}
                  <Box
                    component="img"
                    src={convertedImageUrl}
                    alt="Converted"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                      transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                      transformOrigin: 'center center',
                      transition: isZooming ? 'none' : 'transform 0.1s ease-out',
                    }}
                  />

                  {/* Slider Line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${sliderPosition}%`,
                      top: 0,
                      width: 2,
                      height: '100%',
                      backgroundColor: 'primary.main',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                    }}
                  />

                  {/* Slider Handle */}
                  <Box
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    sx={{
                      position: 'absolute',
                      left: `${sliderPosition}%`,
                      top: '50%',
                      width: 48,
                      height: 48,
                      backgroundColor: 'primary.main',
                      border: '4px solid',
                      borderColor: 'background.paper',
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: theme.shadows[8],
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translate(-50%, -50%) scale(1.1)',
                        boxShadow: theme.shadows[12],
                      },
                      '&::before, &::after': {
                        content: '""',
                        position: 'absolute',
                        width: 10,
                        height: 2,
                        backgroundColor: 'primary.contrastText',
                        borderRadius: 1,
                      },
                      '&::before': {
                        transform: 'translateX(-6px)',
                      },
                      '&::after': {
                        transform: 'translateX(6px)',
                      },
                    }}
                  />

                  {/* Labels */}
                  <Chip
                    label="Original"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      '& .MuiChip-label': {
                        px: 1.5,
                        py: 0.5,
                      }
                    }}
                  />
                  <Chip
                    label="Converted"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      '& .MuiChip-label': {
                        px: 1.5,
                        py: 0.5,
                      }
                    }}
                  />
                </Box>
              ) : (
                // Side by Side View
                <Box 
                  ref={containerRef}
                  onMouseDown={zoomLevel > 1 ? handlePanStart : undefined}
                  sx={{ 
                    display: 'flex', 
                    height: { xs: 450, md: 650 },
                    cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ 
                    position: 'relative', 
                    width: '50%',
                    borderRight: `2px solid ${theme.palette.divider}`,
                    overflow: 'hidden'
                  }}>
                    <Box
                      component="img"
                      src={originalImageUrl}
                      alt="Original"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                        transformOrigin: 'center center',
                        transition: isZooming ? 'none' : 'transform 0.1s ease-out',
                      }}
                    />
                    <Chip
                      label="Original"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 20,
                        left: 20,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        zIndex: 10,
                        '& .MuiChip-label': {
                          px: 1.5,
                          py: 0.5,
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ 
                    position: 'relative', 
                    width: '50%',
                    overflow: 'hidden'
                  }}>
                    <Box
                      component="img"
                      src={convertedImageUrl}
                      alt="Converted"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                        transformOrigin: 'center center',
                        transition: isZooming ? 'none' : 'transform 0.1s ease-out',
                      }}
                    />
                    <Chip
                      label="Converted"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        zIndex: 10,
                        '& .MuiChip-label': {
                          px: 1.5,
                          py: 0.5,
                        }
                      }}
                    />
                  </Box>
                </Box>
              )}

              {/* Zoom Controls */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 24,
                  right: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  bgcolor: 'rgba(0,0,0,0.8)',
                  borderRadius: 3,
                  p: 1,
                  boxShadow: theme.shadows[8],
                }}
              >
                <IconButton
                  size="small"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 5}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                    },
                    '&:disabled': {
                      color: 'rgba(255,255,255,0.3)',
                    }
                  }}
                  title="Zoom In"
                >
                  <ZoomIn />
                </IconButton>
                
                <Typography
                  variant="caption"
                  sx={{
                    color: 'white',
                    textAlign: 'center',
                    minWidth: 40,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                  }}
                >
                  {Math.round(zoomLevel * 100)}%
                </Typography>
                
                <IconButton
                  size="small"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 0.5}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                    },
                    '&:disabled': {
                      color: 'rgba(255,255,255,0.3)',
                    }
                  }}
                  title="Zoom Out"
                >
                  <ZoomOut />
                </IconButton>
                
                <IconButton
                  size="small"
                  onClick={resetZoom}
                  disabled={zoomLevel === 1 && panPosition.x === 0 && panPosition.y === 0}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                    },
                    '&:disabled': {
                      color: 'rgba(255,255,255,0.3)',
                    }
                  }}
                  title="Reset Zoom"
                >
                  <CenterFocusStrong />
                </IconButton>
              </Box>

              {/* Zoom Instructions */}
              {zoomLevel > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    zIndex: 10,
                  }}
                >
                  Drag to pan • Scroll to zoom
                </Box>
              )}
            </Box>

            {/* Slider Control for Comparison Mode */}
            {viewMode === 'comparison' && (
              <Box sx={{ 
                p: 4, 
                bgcolor: 'background.paper',
                borderTop: `1px solid ${theme.palette.divider}`,
                borderRadius: '0 0 12px 12px'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography 
                    variant="body1" 
                    color="text.primary" 
                    sx={{ fontWeight: 500 }}
                  >
                    Comparison Controls
                  </Typography>
                  <Chip
                    label={`Zoom: ${Math.round(zoomLevel * 100)}%`}
                    size="small"
                    color={zoomLevel === 1 ? 'default' : 'primary'}
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {zoomLevel > 1 
                    ? 'Drag images to pan • Scroll wheel to zoom • Use controls or buttons below'
                    : 'Drag the handle above or use the slider below to compare your images'
                  }
                </Typography>
                <Slider
                  value={sliderPosition}
                  onChange={(_, value) => setSliderPosition(value as number)}
                  min={0}
                  max={100}
                  sx={{ 
                    mt: 2, 
                    mb: 3,
                    '& .MuiSlider-thumb': {
                      width: 24,
                      height: 24,
                      '&:hover': {
                        boxShadow: theme.shadows[4],
                      }
                    },
                    '& .MuiSlider-track': {
                      height: 6,
                    },
                    '& .MuiSlider-rail': {
                      height: 6,
                    }
                  }}
                />
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => setSliderPosition(0)}
                    sx={{ minWidth: 100 }}
                  >
                    Original
                  </Button>
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={() => setSliderPosition(50)}
                    sx={{ minWidth: 80 }}
                  >
                    50/50
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => setSliderPosition(100)}
                    sx={{ minWidth: 100 }}
                  >
                    Converted
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Image Info */}
            <Box sx={{ 
              p: 4, 
              bgcolor: 'background.paper',
              borderTop: `1px solid ${theme.palette.divider}`,
              borderRadius: viewMode === 'comparison' ? 0 : '0 0 12px 12px'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Info sx={{ mr: 1.5, color: 'primary.main', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Image Details
                  </Typography>
                </Box>
                {viewMode === 'sideBySide' && zoomLevel !== 1 && (
                  <Chip
                    label={`Zoom: ${Math.round(zoomLevel * 100)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>

              <Stack spacing={2}>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 3
                }}>
                  {imageInfo && (
                    <>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Dimensions
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {imageInfo.width} × {imageInfo.height}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          pixels
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Original Size
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {formatFileSize(originalSize)}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          New Size
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {formatFileSize(convertedSize)}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Difference
                        </Typography>
                        <Typography 
                          variant="body1"
                          sx={{ 
                            fontWeight: 700, 
                            mt: 0.5,
                            color: getSavingsPercentage().startsWith('-') ? 'success.main' : 'warning.main'
                          }}
                        >
                          {getSavingsPercentage()}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>

                {/* Format Info */}
                <Box sx={{ 
                  p: 3, 
                  bgcolor: 'background.default', 
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.shadows[2]
                }}>
                  <Typography 
                    variant="subtitle1" 
                    gutterBottom 
                    color="success.main"
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    ✅ Conversion Summary
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: 3,
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Original Format
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {originalFile.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Output Format
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {outputFormat.toUpperCase()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Size Change
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          mt: 0.5,
                          color: getSavingsPercentage().startsWith('-') ? 'success.main' : 'warning.main'
                        }}
                      >
                        {getSavingsPercentage()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BeforeAfterPreview; 