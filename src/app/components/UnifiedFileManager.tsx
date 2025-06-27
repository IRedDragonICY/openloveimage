'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  Divider,
  Avatar,
  ListItemAvatar,
  CircularProgress,
  Paper,
  Stack,
  Fade,
  Collapse,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Download,
  CheckCircle,
  Error,
  PlayArrow,
  GetApp,
  Image as ImageIcon,
  Visibility,
  Compare,
  Close,
  ExpandMore,
  ExpandLess,
  Refresh,
  Transform,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import ImagePreview from './ImagePreview';
import BeforeAfterPreview from './BeforeAfterPreview';
import { heicTo, isHeic } from 'heic-to';

// Helper function to get actual file type including HEIC
const getActualFileType = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Handle HEIC files which browsers might not recognize
  if (extension === 'heic' || extension === 'heif') {
    return 'HEIC';
  }
  
  // For other files, try to get from MIME type or fallback to extension
  if (file.type && file.type.includes('/')) {
    const mimeType = file.type.split('/')[1]?.toUpperCase();
    if (mimeType && mimeType !== 'OCTET-STREAM') {
      return mimeType === 'JPEG' ? 'JPG' : mimeType;
    }
  }
  
  return extension?.toUpperCase() || 'Unknown';
};

export interface ProcessedFile {
  id: string;
  originalFile: File;
  originalSize: number;
  convertedBlob?: Blob;
  convertedSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  outputFormat: string;
}

interface UnifiedFileManagerProps {
  onProcessFiles: (files: File[]) => Promise<ProcessedFile[]>;
  outputFormat: string;
}

const UnifiedFileManager = ({ onProcessFiles, outputFormat }: UnifiedFileManagerProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<{ [key: string]: boolean }>({});
  const [expandedFiles, setExpandedFiles] = useState(true);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    file: File | Blob;
    fileName: string;
    isConverted: boolean;
    originalFile?: File;
    fileSize?: number;
    outputFormat?: string;
  } | null>(null);
  
  // Before/After preview states
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false);
  const [beforeAfterFile, setBeforeAfterFile] = useState<ProcessedFile | null>(null);

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    generateThumbnails(acceptedFiles);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.svg']
    },
    multiple: true,
    noClick: true,
  });

  // Generate thumbnails for new files
  const generateThumbnails = useCallback(async (fileList: File[]) => {
    const loadingStates: { [key: string]: boolean } = {};
    fileList.forEach(file => {
      loadingStates[file.name] = true;
    });
    setLoadingThumbnails(prev => ({ ...prev, ...loadingStates }));

    for (const file of fileList) {
      try {
        const thumbnail = await createThumbnail(file);
        setThumbnails(prev => ({ ...prev, [file.name]: thumbnail }));
        setLoadingThumbnails(prev => ({ ...prev, [file.name]: false }));
      } catch (error) {
        console.error('Failed to generate thumbnail for', file.name, error);
        setLoadingThumbnails(prev => ({ ...prev, [file.name]: false }));
      }
    }
  }, []);

  const createThumbnail = async (file: File): Promise<string> => {
    try {
      let imageFile = file;
      
      const isHeicFile = await isHeic(file);
      if (isHeicFile) {
        try {
          const convertedBlob = await heicTo({
            blob: file,
            type: 'image/jpeg',
            quality: 0.3
          });
          imageFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
            type: 'image/jpeg'
          });
        } catch (heicError) {
          console.error('HEIC conversion failed for thumbnail:', heicError);
          throw 'Failed to convert HEIC file for thumbnail';
        }
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
          const size = 56;
          canvas.width = size;
          canvas.height = size;
          
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size / 2) - (img.width / 2) * scale;
          const y = (size / 2) - (img.height / 2) * scale;
          
          if (ctx) {
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            reject('Could not get canvas context');
          }
          
          URL.revokeObjectURL(img.src);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject('Failed to load image for thumbnail');
        };
        
        img.src = URL.createObjectURL(imageFile);
      });
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw error;
    }
  };

  // Update processed files when files or output format changes
  useEffect(() => {
    const newProcessedFiles: ProcessedFile[] = files.map((file, index) => ({
      id: `${file.name}-${index}`,
      originalFile: file,
      originalSize: file.size,
      status: 'pending',
      outputFormat,
    }));
    setProcessedFiles(newProcessedFiles);
  }, [files, outputFormat]);

  // File management functions
  const removeFile = useCallback((index: number) => {
    const fileToRemove = files[index];
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Clean up thumbnail
    if (thumbnails[fileToRemove.name]) {
      URL.revokeObjectURL(thumbnails[fileToRemove.name]);
      setThumbnails(prev => {
        const newThumbnails = { ...prev };
        delete newThumbnails[fileToRemove.name];
        return newThumbnails;
      });
    }
    
    setLoadingThumbnails(prev => {
      const newLoading = { ...prev };
      delete newLoading[fileToRemove.name];
      return newLoading;
    });
  }, [files, thumbnails]);

  const clearAllFiles = () => {
    // Clean up all thumbnails
    Object.values(thumbnails).forEach(url => URL.revokeObjectURL(url));
    setFiles([]);
    setThumbnails({});
    setLoadingThumbnails({});
    setProcessedFiles([]);
  };

  // Preview handlers
  const handlePreviewClick = (
    file: File | Blob, 
    fileName: string, 
    isConverted: boolean = false, 
    originalFile?: File, 
    fileSize?: number,
    format?: string
  ) => {
    setPreviewFile({
      file,
      fileName,
      isConverted,
      originalFile,
      fileSize,
      outputFormat: format,
    });
    setPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleBeforeAfterClick = (file: ProcessedFile) => {
    setBeforeAfterFile(file);
    setBeforeAfterOpen(true);
  };

  const handleBeforeAfterClose = () => {
    setBeforeAfterOpen(false);
    setBeforeAfterFile(null);
  };

  // Processing functions
  const handleProcessFiles = async () => {
    const pendingFiles = files.filter((_, index) => processedFiles[index]?.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);

    try {
      // Only set processing status for pending files
      setProcessedFiles(prev => 
        prev.map(file => 
          file.status === 'pending' 
            ? { ...file, status: 'processing' as const, error: undefined }
            : file
        )
      );

      const results = await onProcessFiles(pendingFiles);
      
      // Update only the files that were processed
      let resultIndex = 0;
      setProcessedFiles(prev => 
        prev.map(file => {
          if (file.status === 'processing') {
            return results[resultIndex++];
          }
          return file;
        })
      );
    } catch (error) {
      console.error('Processing failed:', error);
      setProcessedFiles(prev => 
        prev.map(file => 
          file.status === 'processing'
            ? { 
                ...file, 
                status: 'error' as const, 
                error: 'Processing failed' 
              }
            : file
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert individual file
  const handleProcessSingleFile = async (fileIndex: number) => {
    const targetFile = files[fileIndex];
    if (!targetFile) return;

    // Update status to processing for this specific file
    setProcessedFiles(prev => 
      prev.map((file, index) => 
        index === fileIndex 
          ? { ...file, status: 'processing' as const, error: undefined }
          : file
      )
    );

    try {
      const results = await onProcessFiles([targetFile]);
      const result = results[0];
      
      // Update only this specific file
      setProcessedFiles(prev => 
        prev.map((file, index) => 
          index === fileIndex ? result : file
        )
      );
    } catch (error) {
      console.error('Single file processing failed:', error);
      setProcessedFiles(prev => 
        prev.map((file, index) => 
          index === fileIndex 
            ? { 
                ...file, 
                status: 'error' as const, 
                error: 'Processing failed' 
              }
            : file
        )
      );
    }
  };

  // Reset file status for re-conversion
  const handleResetFile = (fileIndex: number) => {
    setProcessedFiles(prev => 
      prev.map((file, index) => 
        index === fileIndex 
          ? { 
              ...file, 
              status: 'pending' as const, 
              error: undefined,
              convertedBlob: undefined,
              convertedSize: undefined
            }
          : file
      )
    );
  };

  const downloadSingleFile = (processedFile: ProcessedFile) => {
    if (!processedFile.convertedBlob) return;

    const fileExtension = processedFile.outputFormat === 'jpeg' ? 'jpg' : processedFile.outputFormat;
    const fileName = processedFile.originalFile.name.replace(/\.[^/.]+$/, '') + '.' + fileExtension;
    
    saveAs(processedFile.convertedBlob, fileName);
  };

  const downloadAllAsZip = async () => {
    const completedFiles = processedFiles.filter(file => file.status === 'completed' && file.convertedBlob);
    
    if (completedFiles.length === 0) return;

    const zip = new JSZip();
    
    completedFiles.forEach((file) => {
      if (file.convertedBlob) {
        const fileExtension = file.outputFormat === 'jpeg' ? 'jpg' : file.outputFormat;
        const fileName = file.originalFile.name.replace(/\.[^/.]+$/, '') + '.' + fileExtension;
        zip.file(fileName, file.convertedBlob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `converted-images-${new Date().getTime()}.zip`);
  };

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSavingsPercentage = (originalSize: number, convertedSize: number): string => {
    const savings = ((originalSize - convertedSize) / originalSize) * 100;
    return savings > 0 ? `-${savings.toFixed(1)}%` : `+${Math.abs(savings).toFixed(1)}%`;
  };

  // Statistics
  const pendingCount = processedFiles.filter(f => f.status === 'pending').length;
  const processingCount = processedFiles.filter(f => f.status === 'processing').length;
  const completedCount = processedFiles.filter(f => f.status === 'completed').length;
  const errorCount = processedFiles.filter(f => f.status === 'error').length;
  const totalOriginalSize = processedFiles.reduce((sum, file) => sum + file.originalSize, 0);
  const totalConvertedSize = processedFiles.reduce((sum, file) => sum + (file.convertedSize || 0), 0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(thumbnails).forEach(url => URL.revokeObjectURL(url));
    };
  }, [thumbnails]);

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        elevation={isDragActive ? 8 : 2}
        sx={{
          p: { xs: 4, md: 6 },
          textAlign: 'center',
          cursor: 'pointer',
          border: isDragActive ? '2px dashed #1976d2' : '2px dashed transparent',
          borderRadius: 3,
          backgroundColor: isDragActive 
            ? 'rgba(25, 118, 210, 0.08)' 
            : 'background.paper',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
            elevation: 4,
          },
          mb: files.length > 0 ? 3 : 0,
        }}
      >
        <input {...getInputProps()} />
        
        <Fade in={true} timeout={800}>
          <Box>
            <Box sx={{ mb: 3 }}>
              {isDragActive ? (
                <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              ) : (
                <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              )}
            </Box>

            <Typography 
              variant="h5" 
              gutterBottom 
              color={isDragActive ? 'primary' : 'text.primary'}
              sx={{ fontWeight: 600 }}
            >
              {isDragActive ? 'Drop your images here!' : 'Upload & Convert Images'}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {isDragActive 
                ? 'Release to upload your files' 
                : 'Drag & drop images or click to browse'
              }
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CloudUpload />}
                onClick={open}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                Choose Files
              </Button>
              
              {files.length > 0 && (
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Close />}
                  onClick={clearAllFiles}
                  sx={{ px: 3, py: 1.5 }}
                >
                  Clear All
                </Button>
              )}
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>Supported formats:</strong> HEIC, JPG, PNG, WebP, GIF, BMP, TIFF, SVG
            </Typography>
            
            <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
              🔒 Your files are processed locally for maximum privacy • Max 50MB per file
            </Typography>
          </Box>
        </Fade>
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            {/* Header */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 2 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton 
                  size="small"
                  onClick={() => setExpandedFiles(!expandedFiles)}
                  sx={{ mr: 1 }}
                >
                  {expandedFiles ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Images ({files.length})
                </Typography>
                
                {/* Status Chips */}
                <Stack direction="row" spacing={1}>
                  {pendingCount > 0 && (
                    <Chip 
                      label={`${pendingCount} pending`}
                      color="default"
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {processingCount > 0 && (
                    <Chip 
                      label={`${processingCount} processing`}
                      color="primary"
                      size="small"
                      variant="filled"
                    />
                  )}
                  {completedCount > 0 && (
                    <Chip 
                      label={`${completedCount} completed`}
                      color="success"
                      size="small"
                      variant="filled"
                    />
                  )}
                  {errorCount > 0 && (
                    <Chip 
                      label={`${errorCount} error`}
                      color="error"
                      size="small"
                      variant="filled"
                    />
                  )}
                </Stack>
              </Box>
              
              <Stack direction="row" spacing={1}>
                {!isProcessing && pendingCount > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={handleProcessFiles}
                    sx={{ fontWeight: 600 }}
                  >
                    Convert All Pending ({pendingCount})
                  </Button>
                )}
                
                {completedCount > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<GetApp />}
                    onClick={downloadAllAsZip}
                    sx={{ fontWeight: 600 }}
                  >
                    Download All ({completedCount})
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Processing Progress */}
            {isProcessing && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Converting images...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {completedCount}/{files.length}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(completedCount / files.length) * 100} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                  }}
                />
              </Box>
            )}

            {/* Results Summary */}
            {(completedCount > 0 || errorCount > 0) && (
              <Alert 
                severity={errorCount > 0 ? 'warning' : 'success'} 
                sx={{ mb: 3, borderRadius: 2 }}
                icon={errorCount > 0 ? <Error /> : <CheckCircle />}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {completedCount > 0 && `✅ ${completedCount} files converted successfully. `}
                  {errorCount > 0 && `⚠️ ${errorCount} files failed to convert.`}
                </Typography>
                {totalConvertedSize > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Total size: {formatFileSize(totalOriginalSize)} → {formatFileSize(totalConvertedSize)} 
                    <Chip 
                      label={getSavingsPercentage(totalOriginalSize, totalConvertedSize)}
                      size="small"
                      color={getSavingsPercentage(totalOriginalSize, totalConvertedSize).startsWith('-') ? 'success' : 'warning'}
                      sx={{ ml: 1, fontWeight: 600 }}
                    />
                  </Typography>
                )}
              </Alert>
            )}

            {/* File List */}
            <Collapse in={expandedFiles}>
              <List sx={{ pt: 0 }}>
                {processedFiles.map((file, index) => (
                  <Box key={file.id}>
                    <ListItem 
                      sx={{ 
                        px: 0, 
                        py: 2,
                        alignItems: 'flex-start'
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 72 }}>
                        {loadingThumbnails[file.originalFile.name] ? (
                          <Avatar
                            sx={{ 
                              width: 56, 
                              height: 56,
                              bgcolor: 'action.hover',
                            }}
                          >
                            <CircularProgress size={24} thickness={4} />
                          </Avatar>
                        ) : (
                          <Avatar
                            src={thumbnails[file.originalFile.name]}
                            sx={{ 
                              width: 56, 
                              height: 56, 
                              cursor: 'pointer',
                              border: '2px solid transparent',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                border: '2px solid',
                                borderColor: 'primary.main',
                              }
                            }}
                            onClick={() => handlePreviewClick(
                              file.originalFile, 
                              file.originalFile.name,
                              false
                            )}
                          >
                            <ImageIcon />
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, pr: 2 }}>
                            <Typography 
                              variant="body1" 
                              component="span"
                              sx={{ 
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}
                              title={file.originalFile.name}
                            >
                              {file.originalFile.name}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`${getActualFileType(file.originalFile)} → ${file.outputFormat.toUpperCase()}`}
                              color={file.status === 'completed' ? 'success' : 'primary'} 
                              variant={file.status === 'completed' ? 'filled' : 'outlined'}
                              sx={{ fontSize: '0.7rem', height: 20, flexShrink: 0 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" component="span" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                              {formatFileSize(file.originalSize)}
                              {file.convertedSize && (
                                <>
                                  {' → '}
                                  <span style={{ color: 'inherit' }}>
                                    {formatFileSize(file.convertedSize)}
                                  </span>
                                </>
                              )}
                            </Typography>
                            {file.convertedSize && (
                              <Box sx={{ mt: 0.5 }}>
                                <Chip 
                                  label={getSavingsPercentage(file.originalSize, file.convertedSize)}
                                  size="small"
                                  color={getSavingsPercentage(file.originalSize, file.convertedSize).startsWith('-') ? 'success' : 'warning'}
                                  sx={{ fontSize: '0.7rem', height: 18 }}
                                />
                              </Box>
                            )}
                            {file.error && (
                              <Typography variant="caption" component="span" color="error" sx={{ mt: 0.5, display: 'block' }}>
                                ❌ {file.error}
                              </Typography>
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                      />

                      {/* Status and Actions Container */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 1,
                        ml: 2
                      }}>
                        {/* Status Chip */}
                        <Box>
                          {file.status === 'pending' && (
                            <Chip size="small" label="Pending" color="default" />
                          )}
                          {file.status === 'processing' && (
                            <Chip size="small" label="Processing" color="primary" />
                          )}
                          {file.status === 'completed' && (
                            <Chip size="small" label="Completed" color="success" icon={<CheckCircle />} />
                          )}
                          {file.status === 'error' && (
                            <Chip size="small" label="Error" color="error" icon={<Error />} />
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {/* Pending State Actions */}
                          {file.status === 'pending' && (
                            <>
                              <IconButton 
                                onClick={() => handleProcessSingleFile(index)}
                                color="primary"
                                size="small"
                                title="Convert this file"
                                sx={{
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                  '&:hover': { bgcolor: 'primary.dark' }
                                }}
                              >
                                <Transform />
                              </IconButton>
                              <IconButton 
                                onClick={() => removeFile(index)}
                                color="error"
                                size="small"
                                title="Remove file"
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </>
                          )}

                          {/* Processing State */}
                          {file.status === 'processing' && (
                            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
                              <CircularProgress size={16} thickness={4} />
                            </Box>
                          )}

                          {/* Completed State Actions */}
                          {file.status === 'completed' && file.convertedBlob && (
                            <>
                              <IconButton 
                                onClick={() => handleBeforeAfterClick(file)}
                                color="secondary"
                                size="small"
                                title="Compare before & after"
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': { bgcolor: 'action.selected' }
                                }}
                              >
                                <Compare />
                              </IconButton>
                              <IconButton 
                                onClick={() => handlePreviewClick(
                                  file.convertedBlob!,
                                  file.originalFile.name.replace(/\.[^/.]+$/, '') + '.' + (file.outputFormat === 'jpeg' ? 'jpg' : file.outputFormat),
                                  true,
                                  file.originalFile,
                                  file.convertedSize,
                                  file.outputFormat
                                )}
                                color="info"
                                size="small"
                                title="Preview converted image"
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': { bgcolor: 'action.selected' }
                                }}
                              >
                                <Visibility />
                              </IconButton>
                              <IconButton 
                                onClick={() => downloadSingleFile(file)}
                                color="success"
                                size="small"
                                title="Download converted file"
                                sx={{
                                  bgcolor: 'success.main',
                                  color: 'success.contrastText',
                                  '&:hover': { bgcolor: 'success.dark' }
                                }}
                              >
                                <Download />
                              </IconButton>
                              <IconButton 
                                onClick={() => handleResetFile(index)}
                                color="warning"
                                size="small"
                                title="Convert again with different settings"
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': { bgcolor: 'warning.light', color: 'warning.contrastText' }
                                }}
                              >
                                <Refresh />
                              </IconButton>
                            </>
                          )}

                          {/* Error State Actions */}
                          {file.status === 'error' && (
                            <>
                              <IconButton 
                                onClick={() => handleProcessSingleFile(index)}
                                color="primary"
                                size="small"
                                title="Retry conversion"
                                sx={{
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                  '&:hover': { bgcolor: 'primary.dark' }
                                }}
                              >
                                <Refresh />
                              </IconButton>
                              <IconButton 
                                onClick={() => removeFile(index)}
                                color="error"
                                size="small"
                                title="Remove file"
                                sx={{
                                  bgcolor: 'action.hover',
                                  '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </>
                          )}
                        </Stack>
                      </Box>
                    </ListItem>
                    {index < processedFiles.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Preview Modals */}
      {previewFile && (
        <ImagePreview
          file={previewFile.file}
          fileName={previewFile.fileName}
          open={previewOpen}
          onClose={handlePreviewClose}
          isConverted={previewFile.isConverted}
          originalFile={previewFile.originalFile}
          fileSize={previewFile.fileSize}
          outputFormat={previewFile.outputFormat}
        />
      )}

      {beforeAfterFile && beforeAfterFile.convertedBlob && (
        <BeforeAfterPreview
          originalFile={beforeAfterFile.originalFile}
          convertedFile={beforeAfterFile.convertedBlob}
          fileName={beforeAfterFile.originalFile.name}
          open={beforeAfterOpen}
          onClose={handleBeforeAfterClose}
          outputFormat={beforeAfterFile.outputFormat}
          originalSize={beforeAfterFile.originalSize}
          convertedSize={beforeAfterFile.convertedSize || 0}
        />
      )}
    </Box>
  );
};

export default UnifiedFileManager; 