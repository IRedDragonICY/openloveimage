'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Close,
  Download,
  Info,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { heicTo, isHeic } from 'heic-to';

interface ImagePreviewProps {
  file: File | Blob;
  fileName: string;
  open: boolean;
  onClose: () => void;
  isConverted?: boolean;
  originalFile?: File;
  fileSize?: number;
  outputFormat?: string;
}

const ImagePreview = ({ 
  file, 
  fileName, 
  open, 
  onClose, 
  isConverted = false,
  originalFile,
  fileSize,
  outputFormat 
}: ImagePreviewProps) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageInfo, setImageInfo] = useState<{
    width: number;
    height: number;
    size: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (open && file) {
      setLoading(true);
      setError('');

      const loadImage = async () => {
        try {
          let imageUrl: string;

          // Handle HEIC files (only if it's a File, not a Blob)
          const isHeicFile = file instanceof File ? await isHeic(file) : false;
          if (isHeicFile) {
            try {
              const convertedImage = await heicTo({
                blob: file,
                type: 'image/jpeg',
                quality: 0.9
              });
              imageUrl = URL.createObjectURL(convertedImage);
            } catch (heicError) {
              console.error('HEIC conversion failed:', heicError);
              setError('Failed to convert HEIC file for preview');
              setLoading(false);
              return;
            }
          } else {
            imageUrl = URL.createObjectURL(file);
          }

          setImageUrl(imageUrl);

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            setImageInfo({
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: file.size,
            });
            setLoading(false);
          };
          img.onerror = () => {
            setError('Failed to load image');
            setLoading(false);
          };
          img.src = imageUrl;

          return () => {
            URL.revokeObjectURL(imageUrl);
          };
        } catch (error) {
          console.error('Error loading image:', error);
          setError('Failed to load image');
          setLoading(false);
        }
      };

      loadImage();
    }
  }, [open, file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (file && fileName) {
      saveAs(file, fileName);
    }
  };

  const getSavingsPercentage = (): string | null => {
    if (originalFile && fileSize) {
      const savings = ((originalFile.size - fileSize) / originalFile.size) * 100;
      return savings > 0 ? `-${savings.toFixed(1)}%` : `+${Math.abs(savings).toFixed(1)}%`;
    }
    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" noWrap>
            {fileName}
          </Typography>
          {isConverted && outputFormat && (
            <Chip 
              label={outputFormat.toUpperCase()} 
              color="success" 
              size="small" 
              variant="outlined"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {file && (
            <IconButton onClick={handleDownload} color="primary">
              <Download />
            </IconButton>
          )}
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: { xs: 400, md: 500 },
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress size={48} thickness={4} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Loading image preview...
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', maxWidth: 300 }}>
              {fileName.toLowerCase().includes('.heic') ? 'Converting HEIC file...' : 'Processing image...'}
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
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 500, textAlign: 'center' }}>
              Failed to Load Image
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
              {error}
            </Typography>
            <Button variant="outlined" color="primary" onClick={onClose} sx={{ mt: 2 }}>
              Close and Try Again
            </Button>
          </Box>
        )}

        {!loading && !error && imageUrl && (
          <Box>
            {/* Image Container */}
            <Box sx={{ 
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'rgba(0,0,0,0.1)',
              minHeight: { xs: 300, md: 500 },
              overflow: 'hidden',
            }}>
              <Box
                component="img"
                src={imageUrl}
                alt={fileName}
                sx={{
                  maxWidth: '100%',
                  maxHeight: { xs: 300, md: 500 },
                  objectFit: 'contain',
                  cursor: 'pointer',
                }}
              />
              
              <Typography
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                Click for Before/After comparison
              </Typography>
            </Box>

            {/* Image Info */}
            <Box sx={{ p: 3, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Info sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Image Information</Typography>
              </Box>

              <Stack spacing={2}>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 2
                }}>
                  {imageInfo && (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Dimensions
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {imageInfo.width} × {imageInfo.height} px
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          File Size
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatFileSize(imageInfo.size)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Aspect Ratio
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {(imageInfo.width / imageInfo.height).toFixed(2)}:1
                        </Typography>
                      </Box>

                      {outputFormat && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Format
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {outputFormat.toUpperCase()}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>

                {/* Conversion Stats */}
                {isConverted && originalFile && fileSize && (
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'background.paper', 
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <Typography variant="subtitle2" gutterBottom color="success.main">
                      Conversion Results
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 2,
                      mt: 1
                    }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Original Size
                        </Typography>
                        <Typography variant="body2">
                          {formatFileSize(originalFile.size)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          New Size
                        </Typography>
                        <Typography variant="body2">
                          {formatFileSize(fileSize)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Size Change
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={getSavingsPercentage()?.startsWith('-') ? 'success.main' : 'warning.main'}
                        >
                          {getSavingsPercentage() || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreview; 