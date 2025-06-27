'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Chip,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { 
  CloudUpload, 
  Image as ImageIcon, 
  Close,
  Visibility
} from '@mui/icons-material';
import { heicTo, isHeic } from 'heic-to';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats?: string[];
}

const ImageUploader = ({ onFilesSelected }: ImageUploaderProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  const [loadingPreviews, setLoadingPreviews] = useState<{ [key: string]: boolean }>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    onFilesSelected(acceptedFiles);
    
    // Generate previews for new files
    generatePreviews(acceptedFiles);
  }, [onFilesSelected]);

  const generatePreviews = async (files: File[]) => {
    // Set loading state for all files
    const loadingStates: { [key: string]: boolean } = {};
    files.forEach(file => {
      loadingStates[file.name] = true;
    });
    setLoadingPreviews(prev => ({ ...prev, ...loadingStates }));

    const newPreviews: { [key: string]: string } = {};
    
    for (const file of files) {
      try {
        let previewFile = file;
        
        // Check if file is HEIC and convert for preview
        const isHeicFile = await isHeic(file);
        if (isHeicFile) {
          try {
            // Convert HEIC to JPEG for preview
            const convertedBlob = await heicTo({
              blob: file,
              type: 'image/jpeg',
              quality: 0.5 // Medium quality for preview
            });
            previewFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
              type: 'image/jpeg'
            });
          } catch (heicError) {
            console.error('HEIC conversion failed for preview:', heicError);
            // Still try to create preview URL from original file
          }
        }
        
        const preview = URL.createObjectURL(previewFile);
        newPreviews[file.name] = preview;
        
        // Update preview and clear loading for this file
        setFilePreviews(prev => ({ ...prev, [file.name]: preview }));
        setLoadingPreviews(prev => ({ ...prev, [file.name]: false }));
      } catch (error) {
        console.error('Failed to generate preview for', file.name, error);
        // Clear loading even on error
        setLoadingPreviews(prev => ({ ...prev, [file.name]: false }));
      }
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
    
    // Clean up preview URL
    if (filePreviews[fileName]) {
      URL.revokeObjectURL(filePreviews[fileName]);
      setFilePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[fileName];
        return newPreviews;
      });
    }
    
    // Clear loading state
    setLoadingPreviews(prev => {
      const newLoading = { ...prev };
      delete newLoading[fileName];
      return newLoading;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.svg']
    },
    multiple: true,
    noClick: true,
  });

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          border: isDragActive ? '2px dashed #1976d2' : '2px dashed rgba(255,255,255,0.3)',
          borderRadius: 3,
          backgroundColor: isDragActive ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.05)',
            borderColor: '#1976d2',
          },
        }}
      >
        <input {...getInputProps()} />
        
        <Box sx={{ mb: 3 }}>
          {isDragActive ? (
            <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          ) : (
            <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          )}
        </Box>

        <Typography variant="h5" gutterBottom color={isDragActive ? 'primary' : 'text.primary'}>
          {isDragActive ? 'Drop your images here!' : 'Drag & Drop Images'}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {isDragActive 
            ? 'Release to upload your files' 
            : 'Support for HEIC, JPG, PNG, WebP, GIF, BMP, TIFF, SVG formats'
          }
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Maximum file size: 50MB per file • Batch processing supported
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={open}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
          }}
        >
          Choose Files
        </Button>

        <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.7 }}>
          Your files are processed locally in your browser for maximum privacy
        </Typography>
      </Paper>

      {/* File Previews */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Uploaded Files ({uploadedFiles.length})
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 2,
            mt: 2
          }}>
                      {uploadedFiles.map((file) => (
            <Card key={file.name} sx={{ position: 'relative' }}>
              {loadingPreviews[file.name] ? (
                // Loading state untuk HEIC files
                <Box
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    position: 'relative'
                  }}
                >
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height="100%"
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      zIndex: 1
                    }}
                  >
                    <CircularProgress size={32} thickness={4} />
                    <Typography variant="caption" color="text.secondary">
                      Processing...
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <CardMedia
                  component="img"
                  height="140"
                  image={filePreviews[file.name]}
                  alt={file.name}
                  sx={{ 
                    objectFit: 'cover',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                    }
                  }}
                  onClick={() => filePreviews[file.name] && window.open(filePreviews[file.name], '_blank')}
                />
              )}
                
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.8)',
                    }
                  }}
                  onClick={() => removeFile(file.name)}
                >
                  <Close fontSize="small" />
                </IconButton>
                
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.8)',
                    }
                  }}
                  onClick={() => window.open(filePreviews[file.name], '_blank')}
                >
                  <Visibility fontSize="small" />
                </IconButton>
                
                <CardContent sx={{ pt: 1 }}>
                  <Typography variant="body2" noWrap title={file.name}>
                    {file.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                    <Chip 
                      label={file.type.split('/')[1]?.toUpperCase() || 'Unknown'} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ImageUploader; 