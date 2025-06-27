'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  Delete,
  Download,
  CheckCircle,
  Error as ErrorIcon,
  PlayArrow,
  GetApp,
  Image as ImageIcon,
  Visibility,
  Compare,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import ImagePreview from './ImagePreview';
import BeforeAfterPreview from './BeforeAfterPreview';
import { heicTo, isHeic } from 'heic-to';

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

interface FileProcessorProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onProcessFiles: (files: File[]) => Promise<ProcessedFile[]>;
  outputFormat: string;
}

const FileProcessor = ({ files, onRemoveFile, onProcessFiles, outputFormat }: FileProcessorProps) => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    file: File | Blob;
    fileName: string;
    isConverted: boolean;
    originalFile?: File;
    fileSize?: number;
    outputFormat?: string;
  } | null>(null);
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false);
  const [beforeAfterFile, setBeforeAfterFile] = useState<ProcessedFile | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<{ [key: string]: boolean }>({});
  // const [overallProgress, setOverallProgress] = useState(0);

  const generateThumbnails = useCallback(async (fileList: File[]) => {
    // Set loading state for all files
    const loadingStates: { [key: string]: boolean } = {};
    fileList.forEach(file => {
      loadingStates[file.name] = true;
    });
    setLoadingThumbnails(prev => ({ ...prev, ...loadingStates }));

    for (const file of fileList) {
      try {
        const thumbnail = await createThumbnail(file);
        
        // Update thumbnail and clear loading for this file
        setThumbnails(prev => ({ ...prev, [file.name]: thumbnail }));
        setLoadingThumbnails(prev => ({ ...prev, [file.name]: false }));
      } catch (error) {
        console.error('Failed to generate thumbnail for', file.name, error);
        // Clear loading even on error
        setLoadingThumbnails(prev => ({ ...prev, [file.name]: false }));
      }
    }
  }, []);

  useEffect(() => {
    // Reset processed files when files change
    const newProcessedFiles: ProcessedFile[] = files.map((file, index) => ({
      id: `${file.name}-${index}`,
      originalFile: file,
      originalSize: file.size,
      status: 'pending',
      outputFormat,
    }));
    setProcessedFiles(newProcessedFiles);
    
    // Generate thumbnails for new files
    generateThumbnails(files);
  }, [files, outputFormat, generateThumbnails]);



  const createThumbnail = async (file: File): Promise<string> => {
    try {
      let imageFile = file;
      
      // Check if file is HEIC and convert if needed
      const isHeicFile = await isHeic(file);
      if (isHeicFile) {
        try {
          // Convert HEIC to JPEG for thumbnail generation
          const convertedBlob = await heicTo({
            blob: file,
            type: 'image/jpeg',
            quality: 0.3 // Low quality for thumbnail generation
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
          const size = 48; // thumbnail size
          canvas.width = size;
          canvas.height = size;
          
          // Calculate crop to maintain aspect ratio
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size / 2) - (img.width / 2) * scale;
          const y = (size / 2) - (img.height / 2) * scale;
          
          if (ctx) {
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            reject('Could not get canvas context');
          }
          
          // Clean up
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

  const handleProcessFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);

    try {
      // Update status to processing
      setProcessedFiles(prev => 
        prev.map(file => ({ ...file, status: 'processing' as const }))
      );

      const results = await onProcessFiles(files);
      
      setProcessedFiles(results);
    } catch (error) {
      console.error('Processing failed:', error);
      setProcessedFiles(prev => 
        prev.map(file => ({ 
          ...file, 
          status: 'error' as const, 
          error: 'Processing failed' 
        }))
      );
    } finally {
      setIsProcessing(false);
    }
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

  const completedCount = processedFiles.filter(f => f.status === 'completed').length;
  const errorCount = processedFiles.filter(f => f.status === 'error').length;
  const totalOriginalSize = processedFiles.reduce((sum, file) => sum + file.originalSize, 0);
  const totalConvertedSize = processedFiles.reduce((sum, file) => sum + (file.convertedSize || 0), 0);

  if (files.length === 0) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">
            Files to Process ({files.length})
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isProcessing && completedCount === 0 && (
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleProcessFiles}
                disabled={files.length === 0}
              >
                Convert All
              </Button>
            )}
            
            {completedCount > 0 && (
              <Button
                variant="outlined"
                startIcon={<GetApp />}
                onClick={downloadAllAsZip}
                disabled={completedCount === 0}
              >
                Download All ({completedCount})
              </Button>
            )}
          </Box>
        </Box>

        {isProcessing && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing files... {completedCount}/{files.length}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(completedCount / files.length) * 100} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {(completedCount > 0 || errorCount > 0) && (
          <Alert 
            severity={errorCount > 0 ? 'warning' : 'success'} 
            sx={{ mb: 3 }}
          >
            {completedCount > 0 && `${completedCount} files converted successfully. `}
            {errorCount > 0 && `${errorCount} files failed to convert.`}
            {totalConvertedSize > 0 && (
              <> Total size: {formatFileSize(totalOriginalSize)} → {formatFileSize(totalConvertedSize)} 
              ({getSavingsPercentage(totalOriginalSize, totalConvertedSize)})</>
            )}
          </Alert>
        )}

        <List>
          {processedFiles.map((file, index) => (
            <Box key={file.id}>
              <ListItem>
                <ListItemAvatar>
                  {loadingThumbnails[file.originalFile.name] ? (
                    <Avatar
                      sx={{ 
                        width: 56, 
                        height: 56,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
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
                        '&:hover': {
                          opacity: 0.8,
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
                    <Typography variant="body1" component="div">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{file.originalFile.name}</span>
                        <Chip 
                          size="small" 
                          label={file.outputFormat.toUpperCase()} 
                          color="primary" 
                          variant="outlined" 
                        />
                      </Box>
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" component="div">
                      <span>
                        {formatFileSize(file.originalSize)}
                        {file.convertedSize && (
                          <> → {formatFileSize(file.convertedSize)} 
                          ({getSavingsPercentage(file.originalSize, file.convertedSize)})</>
                        )}
                      </span>
                      {file.error && (
                        <Typography variant="caption" color="error" display="block" component="div">
                          Error: {file.error}
                        </Typography>
                      )}
                    </Typography>
                  }
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    <Chip size="small" label="Error" color="error" icon={<ErrorIcon />} />
                  )}
                </Box>

                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {file.status === 'completed' && file.convertedBlob && (
                      <>
                        <IconButton 
                          onClick={() => handleBeforeAfterClick(file)}
                          color="secondary"
                          size="small"
                          title="Compare before & after"
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
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton 
                          onClick={() => downloadSingleFile(file)}
                          color="primary"
                          size="small"
                          title="Download"
                        >
                          <Download />
                        </IconButton>
                      </>
                    )}
                    {file.status === 'pending' && (
                      <IconButton 
                        onClick={() => onRemoveFile(index)}
                        color="error"
                        size="small"
                        title="Remove file"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              {index < processedFiles.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </CardContent>

      {/* Image Preview Modal */}
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

      {/* Before/After Preview Modal */}
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
    </Card>
  );
};

export default FileProcessor; 