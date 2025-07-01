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
  Error as ErrorIcon,
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
  Crop,
  Info,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import ImagePreview from './ImagePreview';
import BeforeAfterPreview from './BeforeAfterPreview';
import ImageCropEditor from './ImageCropEditor';
import ImageMetadataViewer from './ImageMetadataViewer';
import { heicTo, isHeic } from 'heic-to';
import { useSettings } from './SettingsContext';

// Helper function to get actual file type including HEIC
const getActualFileType = (file: File): string => {
  if (!file || !file.name) return 'Unknown';
  
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
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  error?: string;
  outputFormat: string;
  // Upload progress tracking
  uploadProgress?: number; // 0-100
  uploadSpeed?: number; // bytes per second
  uploadedSize?: number; // bytes uploaded so far
  uploadStartTime?: number;
  uploadETA?: number; // estimated time remaining in seconds
  // Conversion progress tracking
  conversionProgress?: number; // 0-100
  conversionStartTime?: number;
  conversionETA?: number; // estimated time remaining in seconds
  // Cancellation tracking
  isCancelling?: boolean;
  // PDF multi-page support
  isMergedIntoPdf?: boolean; // Flag to indicate file was merged into a multi-page PDF
}

interface UnifiedFileManagerProps {
  onProcessFiles: (files: File[], onProgress?: (fileIndex: number, progress: number) => void, abortSignal?: AbortSignal) => Promise<ProcessedFile[]>;
  outputFormat: string;
  conversionSettings?: any; // Add conversion settings to determine filename generation
}

const UnifiedFileManager = ({ onProcessFiles, outputFormat, conversionSettings }: UnifiedFileManagerProps) => {
  const { settings } = useSettings();
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

  // Crop editor states
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [currentCropFile, setCurrentCropFile] = useState<{ file: File; index: number } | null>(null);
  const [croppedFiles, setCroppedFiles] = useState<{ [key: number]: File }>({});
  
  // Metadata viewer states
  const [metadataViewerOpen, setMetadataViewerOpen] = useState(false);
  const [currentMetadataFile, setCurrentMetadataFile] = useState<{ file: File; fileName: string } | null>(null);
  
  // Cancellation states
  const [cancellationRequests, setCancellationRequests] = useState<{ [key: number]: AbortController }>({});
  const [cancellingFiles, setCancellingFiles] = useState<{ [key: number]: boolean }>({});

  // Simulate upload progress for each file with realistic speeds and ETA
  const simulateUploadProgress = useCallback(async (file: File, fileIndex: number) => {
    const fileName = file.name;
    const startTime = Date.now();
    const fileSize = file.size;
    
    // Simulate different upload speeds for different files (0.5MB/s to 5MB/s)
    const baseSpeed = 0.5 * 1024 * 1024; // 0.5 MB/s minimum
    const speedVariation = Math.random() * 4.5 * 1024 * 1024; // up to 4.5 MB/s additional
    const targetSpeed = baseSpeed + speedVariation;
    
    // Calculate chunk size based on target speed (update every 200ms)
    const updateInterval = 200;
    const chunkSize = Math.max((targetSpeed * updateInterval) / 1000, 1024 * 10); // Min 10KB chunks
    
    let uploadedSize = 0;

    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        // Add some speed variation to make it more realistic
        const speedJitter = 0.8 + (Math.random() * 0.4); // 80% to 120% of target speed
        const currentChunkSize = chunkSize * speedJitter;
        
        uploadedSize = Math.min(uploadedSize + currentChunkSize, fileSize);
        const progress = Math.round((uploadedSize / fileSize) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const currentSpeed = elapsed > 0 ? uploadedSize / elapsed : 0;
        
        // Calculate ETA
        const remainingBytes = fileSize - uploadedSize;
        const eta = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;

        setProcessedFiles(prev => 
          prev.map((processedFile, index) => {
            // Find the correct file by matching originalFile
            if (processedFile.originalFile === file) {
              return {
                ...processedFile,
                uploadProgress: progress,
                uploadSpeed: currentSpeed,
                uploadedSize: uploadedSize,
                uploadStartTime: startTime,
                uploadETA: eta,
                status: progress === 100 ? 'pending' : 'uploading'
              };
            }
            return processedFile;
          })
        );

        if (uploadedSize >= fileSize) {
          clearInterval(interval);
          resolve();
        }
      }, updateInterval);
    });
  }, []);

  // Dropzone setup
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Filter out any invalid files
    const validFiles = acceptedFiles.filter(file => file && file.name && file.size !== undefined);
    
    const newFiles = [...files, ...validFiles];
    setFiles(newFiles);
    
    // Start upload simulation for all files in parallel with staggered delays
    const uploadPromises = validFiles.map((file, index) => {
      // Stagger the start times to simulate real-world conditions
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await simulateUploadProgress(file, index);
          resolve();
        }, index * 200); // 200ms delay between each file start
      });
    });
    
    // Generate thumbnails for new files
    generateThumbnails(validFiles);

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
  }, [files, simulateUploadProgress]); // generateThumbnails stable due to its own dependencies

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
    const validFiles = fileList.filter(file => file && file.name);
    const loadingStates: { [key: string]: boolean } = {};
    validFiles.forEach(file => {
      loadingStates[file.name] = true;
    });
    setLoadingThumbnails(prev => ({ ...prev, ...loadingStates }));

    for (const file of validFiles) {
      try {
        const thumbnail = await createThumbnail(file);
        setThumbnails(prev => ({ ...prev, [file.name]: thumbnail }));
        setLoadingThumbnails(prev => ({ ...prev, [file.name]: false }));
      } catch (error) {
        console.error('Failed to generate thumbnail for', file.name, error);
        setLoadingThumbnails(prev => ({ ...prev, [file.name]: false }));
      }
    }
  }, [setLoadingThumbnails, setThumbnails]);

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
    const newProcessedFiles: ProcessedFile[] = files
      .filter(file => file && file.name) // Filter out any undefined or invalid files
      .map((file, index) => ({
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
    if (!fileToRemove) return; // Safety check
    
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Clean up thumbnail
    if (fileToRemove.name && thumbnails[fileToRemove.name]) {
      URL.revokeObjectURL(thumbnails[fileToRemove.name]);
      setThumbnails(prev => {
        const newThumbnails = { ...prev };
        delete newThumbnails[fileToRemove.name];
        return newThumbnails;
      });
    }
    
    if (fileToRemove.name) {
      setLoadingThumbnails(prev => {
        const newLoading = { ...prev };
        delete newLoading[fileToRemove.name];
        return newLoading;
      });
    }
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

  // Crop handlers
  const handleCropClick = (file: File, index: number) => {
    setCurrentCropFile({ file, index });
    setCropEditorOpen(true);
  };

  const handleCropConfirm = (croppedImageBlob: Blob, settings: any) => {
    if (currentCropFile) {
      // Convert blob to file
      const croppedFile = new File(
        [croppedImageBlob],
        `cropped_${currentCropFile.file.name}`,
        { type: croppedImageBlob.type }
      );
      
      // Store the cropped file
      setCroppedFiles(prev => ({
        ...prev,
        [currentCropFile.index]: croppedFile,
      }));

      // Generate thumbnail for cropped file
      generateThumbnails([croppedFile]);
    }
    setCropEditorOpen(false);
    setCurrentCropFile(null);
  };

  const handleCropClose = () => {
    setCropEditorOpen(false);
    setCurrentCropFile(null);
  };

  // Metadata viewer handlers
  const handleMetadataClick = (file: File, fileName: string) => {
    setCurrentMetadataFile({ file, fileName });
    setMetadataViewerOpen(true);
  };

  const handleMetadataClose = () => {
    setMetadataViewerOpen(false);
    setCurrentMetadataFile(null);
  };

  // Cancel conversion for a specific file
  const handleCancelConversion = (fileIndex: number) => {
    const abortController = cancellationRequests[fileIndex];
    if (abortController) {
      console.log(`Cancelling conversion for file index ${fileIndex}`);
      
      // Mark as cancelling
      setCancellingFiles(prev => ({ ...prev, [fileIndex]: true }));
      
      // Abort the operation
      abortController.abort();
      
      // Update file status
      setProcessedFiles(prev => 
        prev.map((file, index) => 
          index === fileIndex 
            ? { 
                ...file, 
                status: 'cancelled' as const,
                isCancelling: true,
                error: 'Conversion cancelled by user'
              }
            : file
        )
      );
      
      // Clean up cancellation state after a short delay
      setTimeout(() => {
        setCancellingFiles(prev => {
          const newState = { ...prev };
          delete newState[fileIndex];
          return newState;
        });
        setCancellationRequests(prev => {
          const newState = { ...prev };
          delete newState[fileIndex];
          return newState;
        });
      }, 1000);
    }
  };

  // Processing functions - Refactored to use individual processing logic
  const handleProcessFiles = async () => {
    // Get indices of pending files
    const pendingIndices = processedFiles
      .map((file, index) => file.status === 'pending' ? index : -1)
      .filter(index => index !== -1);
    
    if (pendingIndices.length === 0) return;

    setIsProcessing(true);

    try {
      // Process each pending file sequentially using the same logic as individual conversion
      for (let i = 0; i < pendingIndices.length; i++) {
        const fileIndex = pendingIndices[i];
        const targetFile = croppedFiles[fileIndex] || files[fileIndex];
        
        if (!targetFile) continue;

        // Update status to processing for this specific file
        setProcessedFiles(prev => 
          prev.map((file, index) => 
            index === fileIndex 
              ? { 
                  ...file, 
                  status: 'processing' as const, 
                  error: undefined,
                  conversionProgress: 0,
                  conversionStartTime: Date.now()
                }
              : file
          )
        );

        try {
          // Create abort controller for cancellation
          const abortController = new AbortController();
          setCancellationRequests(prev => ({ ...prev, [fileIndex]: abortController }));
          
          // Create progress handler for this specific file with ETA calculation
          const handleProgress = (fileIdx: number, progress: number) => {
            setProcessedFiles(prev => 
              prev.map((file, index) => {
                if (index === fileIndex) {
                  const elapsed = file.conversionStartTime ? (Date.now() - file.conversionStartTime) / 1000 : 0;
                  const eta = progress > 0 && progress < 100 ? 
                    (elapsed * (100 - progress)) / progress : 0;
                  
                  return { 
                    ...file, 
                    conversionProgress: progress,
                    conversionETA: eta
                  };
                }
                return file;
              })
            );
          };

          // Use the same conversion logic as individual file processing with abort signal
          const results = await onProcessFiles([targetFile], handleProgress, abortController.signal);
          const result = results[0];
          
          // Validate single result
          if (!results || results.length === 0 || !result) {
            throw new Error('No conversion result received');
          }
          
          // Update this specific file with success result
          setProcessedFiles(prev => 
            prev.map((file, index) => {
              if (index === fileIndex) {
                // Ensure status is explicitly set based on conversion success
                const finalStatus = result.status === 'completed' || result.convertedBlob ? 'completed' : 'error';
                return { 
                  ...file, // Keep original file data
                  ...result, // Apply conversion results
                  originalFile: file.originalFile, // Ensure originalFile is preserved
                  status: finalStatus, // Use the final determined status
                  conversionProgress: 100 
                };
              }
              return file;
            })
          );
          
        } catch (error) {
          console.error(`File ${fileIndex} processing failed:`, error);
          
          // Check if it was cancelled
          const isCancelled = error instanceof Error && error.name === 'AbortError';
          
          // Update this specific file with error or cancelled status
          setProcessedFiles(prev => 
            prev.map((file, index) => 
              index === fileIndex 
                ? { 
                    ...file, 
                    status: isCancelled ? 'cancelled' as const : 'error' as const, 
                    error: isCancelled 
                      ? 'Conversion cancelled by user'
                      : (error instanceof Error ? error.message : 'Processing failed'),
                    conversionProgress: 100,
                    isCancelling: false
                  }
                : file
            )
          );
        } finally {
          // Clean up abort controller
          setCancellationRequests(prev => {
            const newState = { ...prev };
            delete newState[fileIndex];
            return newState;
          });
        }
      }
      
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Mark any remaining processing files as error
      setProcessedFiles(prev => 
        prev.map(file => 
          file.status === 'processing'
            ? { 
                ...file, 
                status: 'error' as const, 
                error: 'Batch processing failed',
                conversionProgress: 100
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
    const targetFile = croppedFiles[fileIndex] || files[fileIndex];
    if (!targetFile) return;

    // Update status to processing for this specific file
    setProcessedFiles(prev => 
      prev.map((file, index) => 
        index === fileIndex 
          ? { 
              ...file, 
              status: 'processing' as const, 
              error: undefined,
              conversionProgress: 0,
              conversionStartTime: Date.now()
            }
          : file
      )
    );

    try {
      // Create abort controller for cancellation
      const abortController = new AbortController();
      setCancellationRequests(prev => ({ ...prev, [fileIndex]: abortController }));
      
      // Create progress handler for this specific file with ETA calculation
      const handleProgress = (fileIdx: number, progress: number) => {
        setProcessedFiles(prev => 
          prev.map((file, index) => {
            if (index === fileIndex) {
              const elapsed = file.conversionStartTime ? (Date.now() - file.conversionStartTime) / 1000 : 0;
              const eta = progress > 0 && progress < 100 ? 
                (elapsed * (100 - progress)) / progress : 0;
              
              return { 
                ...file, 
                conversionProgress: progress,
                conversionETA: eta
              };
            }
            return file;
          })
        );
      };

      // Use individual file processing logic with abort signal
      const results = await onProcessFiles([targetFile], handleProgress, abortController.signal);
      const result = results[0];
      
      // Validate single result
      if (!results || results.length === 0) {
        throw new Error('No conversion results received');
      }
      
      // Update only this specific file
      setProcessedFiles(prev => 
        prev.map((file, index) => {
          if (index === fileIndex) {
            // Safety check: if result is undefined, mark as error
            if (!result) {
              return {
                ...file,
                status: 'error' as const,
                error: 'No conversion result received',
                conversionProgress: 100
              };
            }
            
            // Ensure status is explicitly set based on conversion success
            const finalStatus = result.status === 'completed' || result.convertedBlob ? 'completed' : 'error';
            return { 
              ...file, // Keep original file data
              ...result, // Apply conversion results
              originalFile: file.originalFile, // Ensure originalFile is preserved
              status: finalStatus, // Use the final determined status
              conversionProgress: 100 
            };
          }
          return file;
        })
      );
    } catch (error) {
      console.error(`Single file ${fileIndex} processing failed:`, error);
      
      // Check if it was cancelled
      const isCancelled = error instanceof Error && error.name === 'AbortError';
      
      setProcessedFiles(prev => 
        prev.map((file, index) => 
          index === fileIndex 
            ? { 
                ...file, 
                status: isCancelled ? 'cancelled' as const : 'error' as const, 
                error: isCancelled 
                  ? 'Conversion cancelled by user'
                  : (error instanceof Error ? error.message : 'Processing failed'),
                conversionProgress: 100,
                isCancelling: false
              }
            : file
        )
      );
    } finally {
      // Clean up abort controller
      setCancellationRequests(prev => {
        const newState = { ...prev };
        delete newState[fileIndex];
        return newState;
      });
    }
  };

  // Reset file status for re-conversion
  const handleResetFile = (fileIndex: number) => {
    // Cancel any ongoing conversion first
    if (cancellationRequests[fileIndex]) {
      handleCancelConversion(fileIndex);
    }
    
    setProcessedFiles(prev => 
      prev.map((file, index) => 
        index === fileIndex 
          ? { 
              ...file, 
              status: 'pending' as const,
              convertedBlob: undefined,
              convertedSize: undefined,
              error: undefined,
              conversionProgress: undefined,
              conversionStartTime: undefined,
              conversionETA: undefined,
              isCancelling: false
            }
          : file
      )
    );
  };

  // Helper function for filename generation
  const generateOutputFileName = (originalFileName: string, outputFormat: string): string => {
    let fileExtension = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    
    // Special handling for ICO multiple mode
    if (outputFormat === 'ico' && conversionSettings?.icoExportMode === 'multiple') {
      fileExtension = 'zip';
    }
    
    return originalFileName.replace(/\.[^/.]+$/, '') + '.' + fileExtension;
  };

  const downloadSingleFile = (processedFile: ProcessedFile) => {
    if (!processedFile.convertedBlob || !processedFile.originalFile) return;

    const fileName = generateOutputFileName(processedFile.originalFile.name, processedFile.outputFormat);
    
    saveAs(processedFile.convertedBlob, fileName);
  };

  const downloadAllAsZip = async () => {
    const completedFiles = processedFiles.filter(file => file.status === 'completed' && file.convertedBlob);
    
    if (completedFiles.length === 0) return;

    const zip = new JSZip();
    
    completedFiles.forEach((file) => {
      if (file.convertedBlob && file.originalFile && file.originalFile.name) {
        const fileName = generateOutputFileName(file.originalFile.name, file.outputFormat);
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
  const uploadingCount = processedFiles.filter(f => f.status === 'uploading').length;
  const processingCount = processedFiles.filter(f => f.status === 'processing').length;
  const completedCount = processedFiles.filter(f => f.status === 'completed').length;
  const errorCount = processedFiles.filter(f => f.status === 'error').length;
  const totalOriginalSize = processedFiles.reduce((sum, file) => sum + file.originalSize, 0);
  const totalConvertedSize = processedFiles.reduce((sum, file) => sum + (file.convertedSize || 0), 0);

  // Format upload speed
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
    return (bytesPerSecond / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  };

  // Format ETA time
  const formatETA = (seconds: number): string => {
    if (seconds <= 0 || !isFinite(seconds)) return '';
    
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.ceil(seconds % 60);
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

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

            <Typography variant="body2" component="div" color="text.secondary" sx={{ mb: 2 }}>
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
                  {uploadingCount > 0 && (
                    <Chip 
                      label={`${uploadingCount} uploading`}
                      color="info"
                      size="small"
                      variant="filled"
                    />
                  )}
                  {processingCount > 0 && (
                    <Chip 
                      label={`${processingCount} converting`}
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
                  <Typography variant="body2" component="span" color="text.secondary">
                    Converting images...
                  </Typography>
                  <Typography variant="body2" component="span" color="text.secondary">
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
                icon={errorCount > 0 ? <ErrorIcon /> : <CheckCircle />}
              >
                <Box>
                  <Typography variant="body2" component="div" sx={{ fontWeight: 500 }}>
                    {completedCount > 0 && `✅ ${completedCount} files converted successfully. `}
                    {errorCount > 0 && `⚠️ ${errorCount} files failed to convert.`}
                  </Typography>
                  {totalConvertedSize > 0 && (
                    <Typography variant="body2" component="div" color="text.secondary">
                      Total size: {formatFileSize(totalOriginalSize)} → {formatFileSize(totalConvertedSize)} 
                      <Chip 
                        label={getSavingsPercentage(totalOriginalSize, totalConvertedSize)}
                        size="small"
                        color={getSavingsPercentage(totalOriginalSize, totalConvertedSize).startsWith('-') ? 'success' : 'warning'}
                        sx={{ ml: 1, fontWeight: 600 }}
                      />
                    </Typography>
                  )}
                </Box>
              </Alert>
            )}

            {/* File List */}
            <Collapse in={expandedFiles}>
              <List sx={{ pt: 0 }}>
                {processedFiles.map((file, originalIndex) => {
                  // Skip files with invalid data but don't hide completed conversions
                  if (!file || !file.id) return null;
                  
                  return (
                  <Box key={file.id}>
                    <ListItem 
                      sx={{ 
                        px: 0, 
                        py: 2,
                        alignItems: 'flex-start'
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 72 }}>
                        {file.originalFile?.name && loadingThumbnails[file.originalFile.name] ? (
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
                            src={
                              croppedFiles[originalIndex] 
                                ? thumbnails[croppedFiles[originalIndex].name] || (file.originalFile?.name ? thumbnails[file.originalFile.name] : undefined)
                                : (file.originalFile?.name ? thumbnails[file.originalFile.name] : undefined)
                            }
                            sx={{ 
                              width: 56, 
                              height: 56, 
                              cursor: settings.enablePreview ? 'pointer' : 'default',
                              border: croppedFiles[originalIndex] ? '2px solid' : '2px solid transparent',
                              borderColor: croppedFiles[originalIndex] ? 'success.main' : 'transparent',
                              transition: 'all 0.2s ease',
                              opacity: settings.enablePreview ? 1 : 0.7,
                              '&:hover': settings.enablePreview ? {
                                transform: 'scale(1.05)',
                                border: '2px solid',
                                borderColor: croppedFiles[originalIndex] ? 'success.dark' : 'primary.main',
                              } : {}
                            }}
                            onClick={() => {
                              if (settings.enablePreview) {
                                const fileToPreview = croppedFiles[originalIndex] || file.originalFile;
                                const fileName = croppedFiles[originalIndex]?.name || file.originalFile?.name;
                                if (fileToPreview && fileName) {
                                  handlePreviewClick(fileToPreview, fileName, false);
                                }
                              }
                            }}
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
                              title={file.originalFile?.name || `File ${originalIndex + 1}`}
                            >
                              {file.originalFile?.name || `File ${originalIndex + 1}`}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip 
                                size="small" 
                                label={`${file.originalFile ? getActualFileType(file.originalFile) : 'File'} → ${file.outputFormat.toUpperCase()}`}
                                color={file.status === 'completed' ? 'success' : 'primary'} 
                                variant={file.status === 'completed' ? 'filled' : 'outlined'}
                                sx={{ fontSize: '0.7rem', height: 20, flexShrink: 0 }}
                              />
                              {croppedFiles[originalIndex] && (
                                <Chip 
                                  size="small" 
                                  label="CROPPED"
                                  color="success" 
                                  variant="filled"
                                  icon={<Crop />}
                                  sx={{ fontSize: '0.7rem', height: 20, flexShrink: 0 }}
                                />
                              )}
                            </Box>
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
                            
                            {/* Upload Progress */}
                            {file.status === 'uploading' && file.uploadProgress !== undefined && (
                              <Box sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" color="info.main">
                                    Uploading: {file.uploadProgress}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.uploadSpeed ? formatSpeed(file.uploadSpeed) : '0 B/s'}
                                    {file.uploadETA && file.uploadETA > 0 && (
                                      <> • ETA {formatETA(file.uploadETA)}</>
                                    )}
                                  </Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={file.uploadProgress} 
                                  color="info"
                                  sx={{ height: 4, borderRadius: 2 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                  {file.uploadedSize ? formatFileSize(file.uploadedSize) : '0 B'} / {formatFileSize(file.originalSize)}
                                </Typography>
                              </Box>
                            )}

                            {/* Conversion Progress */}
                            {file.status === 'processing' && file.conversionProgress !== undefined && (
                              <Box sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" color="primary.main">
                                    Converting: {file.conversionProgress}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.conversionStartTime ? 
                                      `${Math.round((Date.now() - file.conversionStartTime) / 1000)}s` : 
                                      '0s'
                                    }
                                    {file.conversionETA && file.conversionETA > 0 && (
                                      <> • ETA {formatETA(file.conversionETA)}</>
                                    )}
                                  </Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={file.conversionProgress} 
                                  color="primary"
                                  sx={{ height: 4, borderRadius: 2 }}
                                />
                              </Box>
                            )}

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
                            {/* PDF Merge Indicator */}
                            {file.isMergedIntoPdf && (
                              <Typography variant="caption" component="span" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                                📄 Merged into multi-page PDF (download from first file)
                              </Typography>
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
                          {file.status === 'uploading' && (
                            <Chip size="small" label="Uploading" color="info" icon={<CloudUpload />} />
                          )}
                          {file.status === 'processing' && (
                            <Chip size="small" label="Converting" color="primary" icon={<Transform />} />
                          )}
                          {file.status === 'completed' && (
                            <Chip size="small" label="Completed" color="success" icon={<CheckCircle />} />
                          )}
                          {file.status === 'error' && (
                            <Chip size="small" label="Error" color="error" icon={<ErrorIcon />} />
                          )}
                          {file.status === 'cancelled' && (
                            <Chip size="small" label="Cancelled" color="warning" icon={<Close />} />
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {/* Universal Actions (available for all states) */}
                          {file.originalFile && (
                            <IconButton 
                              onClick={() => handleMetadataClick(file.originalFile!, file.originalFile!.name)}
                              color="info"
                              size="small"
                              title="View metadata"
                              sx={{
                                bgcolor: 'action.hover',
                                '&:hover': { bgcolor: 'info.light', color: 'info.contrastText' }
                              }}
                            >
                              <Info />
                            </IconButton>
                          )}

                          {/* Pending State Actions */}
                          {file.status === 'pending' && (
                            <>
                              <IconButton 
                                onClick={() => file.originalFile && handleCropClick(file.originalFile, originalIndex)}
                                color="secondary"
                                size="small"
                                title="Crop image"
                                sx={{
                                  bgcolor: croppedFiles[originalIndex] ? 'success.main' : 'secondary.main',
                                  color: croppedFiles[originalIndex] ? 'success.contrastText' : 'secondary.contrastText',
                                  '&:hover': { 
                                    bgcolor: croppedFiles[originalIndex] ? 'success.dark' : 'secondary.dark' 
                                  }
                                }}
                              >
                                <Crop />
                              </IconButton>
                              <IconButton 
                                onClick={() => handleProcessSingleFile(originalIndex)}
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
                                onClick={() => removeFile(originalIndex)}
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

                          {/* Uploading State */}
                          {file.status === 'uploading' && (
                            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
                              <CircularProgress size={16} thickness={4} color="info" />
                            </Box>
                          )}

                          {/* Processing State */}
                          {file.status === 'processing' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {!cancellingFiles[originalIndex] && (
                                <IconButton 
                                  onClick={() => handleCancelConversion(originalIndex)}
                                  color="error"
                                  size="small"
                                  title="Cancel conversion"
                                  sx={{
                                    bgcolor: 'error.main',
                                    color: 'error.contrastText',
                                    '&:hover': { bgcolor: 'error.dark' }
                                  }}
                                >
                                  <Close />
                                </IconButton>
                              )}
                              <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
                                <CircularProgress 
                                  size={16} 
                                  thickness={4} 
                                  color={cancellingFiles[originalIndex] ? "warning" : "primary"}
                                />
                              </Box>
                            </Box>
                          )}

                          {/* Completed State Actions */}
                          {file.status === 'completed' && file.convertedBlob && (
                            <>
                              {settings.enablePreview && (
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
                                    onClick={() => file.originalFile && handlePreviewClick(
                                      file.convertedBlob!,
                                      generateOutputFileName(file.originalFile.name, file.outputFormat),
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
                                </>
                              )}
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
                                onClick={() => handleResetFile(originalIndex)}
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
                                onClick={() => handleProcessSingleFile(originalIndex)}
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
                                onClick={() => removeFile(originalIndex)}
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

                          {/* Cancelled State Actions */}
                          {file.status === 'cancelled' && (
                            <>
                              <IconButton 
                                onClick={() => handleProcessSingleFile(originalIndex)}
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
                                onClick={() => removeFile(originalIndex)}
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
                    {originalIndex < processedFiles.length - 1 && <Divider sx={{ my: 1 }} />}
                  </Box>
                  );
                }).filter(Boolean)}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Preview Modals */}
      {settings.enablePreview && previewFile && (
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

      {settings.enablePreview && beforeAfterFile && beforeAfterFile.convertedBlob && beforeAfterFile.originalFile && (
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

      {/* Image Crop Editor Modal */}
      {currentCropFile && (
        <ImageCropEditor
          open={cropEditorOpen}
          onClose={handleCropClose}
          onConfirm={handleCropConfirm}
          imageFile={currentCropFile.file}
          title={`Crop ${currentCropFile.file.name}`}
        />
      )}

      {/* Image Metadata Viewer Modal */}
      <ImageMetadataViewer
        open={metadataViewerOpen}
        onClose={handleMetadataClose}
        file={currentMetadataFile?.file || null}
        fileName={currentMetadataFile?.fileName || ''}
      />
    </Box>
  );
};

export default UnifiedFileManager; 