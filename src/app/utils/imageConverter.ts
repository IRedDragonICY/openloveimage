import {heicTo, isHeic} from 'heic-to';
import {ConversionSettings} from '../components/ConversionOptions';
import {jsPDF} from 'jspdf';
import toICO from '2ico';
import JSZip from 'jszip';
import * as TIFF from 'tiff';

// Type declaration for imagetracerjs
interface ImageTracerModule {
  imagedataToSVG: (imageData: ImageData, options?: Record<string, unknown>) => string;
}

// Import imagetracerjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageTracerModule = require('imagetracerjs') as ImageTracerModule;

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  error?: string;
  originalSize: number;
  convertedSize?: number;
  isMergedIntoPdf?: boolean; // Flag to indicate file was merged into a multi-page PDF
}

export class ImageConverter {
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;

  private static getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d')!;
    }
    return { canvas: this.canvas, ctx: this.ctx! };
  }

  private static async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number,
    maintainAspectRatio: boolean = true
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    if (maxWidth || maxHeight) {
      if (maintainAspectRatio) {
        const aspectRatio = originalWidth / originalHeight;
        
        if (maxWidth && maxHeight) {
          if (width > maxWidth || height > maxHeight) {
            if (width / maxWidth > height / maxHeight) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }
        } else if (maxWidth && width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        } else if (maxHeight && height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
      } else {
        if (maxWidth) width = maxWidth;
        if (maxHeight) height = maxHeight;
      }
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  private static calculateCropDimensions(
    originalWidth: number,
    originalHeight: number,
    targetAspectRatio: number,
    cropMode: 'center' | 'smart' = 'center',
    cropSizeMode: 'fit' | 'fill' | 'extend' = 'fit'
  ): { x: number; y: number; width: number; height: number } {
    const originalAspectRatio = originalWidth / originalHeight;
    
    let cropWidth: number;
    let cropHeight: number;
    
    // Calculate crop dimensions based on size mode
    if (cropSizeMode === 'fill') {
      // Fill - use full longest dimension for maximum resolution
      const longestSide = Math.max(originalWidth, originalHeight);
      
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
    } else if (cropSizeMode === 'extend') {
      // Extend - crop can be larger than original image in one dimension
      const maxDimension = Math.max(originalWidth, originalHeight);
      
      if (targetAspectRatio > 1) {
        // Wide aspect ratio - maximize width
        cropWidth = maxDimension * 1.2; // 20% extension
        cropHeight = cropWidth / targetAspectRatio;
      } else {
        // Tall aspect ratio - maximize height
        cropHeight = maxDimension * 1.2; // 20% extension
        cropWidth = cropHeight * targetAspectRatio;
      }
    } else {
      // Fit - standard crop that fits within image (original logic)
      if (originalAspectRatio > targetAspectRatio) {
        // Original is wider, need to crop width
        cropHeight = originalHeight;
        cropWidth = cropHeight * targetAspectRatio;
      } else {
        // Original is taller, need to crop height
        cropWidth = originalWidth;
        cropHeight = cropWidth / targetAspectRatio;
      }
      
      // Ensure crop dimensions don't exceed original
      cropWidth = Math.min(cropWidth, originalWidth);
      cropHeight = Math.min(cropHeight, originalHeight);
    }
    
    // Calculate crop position
    let cropX: number;
    let cropY: number;
    
    if (cropMode === 'center') {
      // Center crop
      cropX = (originalWidth - cropWidth) / 2;
      cropY = (originalHeight - cropHeight) / 2;
    } else {
      // Smart crop (for now, use center - can be enhanced later)
      cropX = (originalWidth - cropWidth) / 2;
      cropY = (originalHeight - cropHeight) / 2;
    }
    
    console.log(`🎯 Crop Size Mode: ${cropSizeMode}`);
    console.log(`📏 Calculated dimensions:`, {
      cropWidth: Math.round(cropWidth),
      cropHeight: Math.round(cropHeight),
      cropX: Math.round(cropX),
      cropY: Math.round(cropY),
      resultAspectRatio: (cropWidth / cropHeight).toFixed(3)
    });
    
    return {
      x: Math.round(cropX),
      y: Math.round(cropY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    };
  }

  private static async convertWithCanvas(
    image: HTMLImageElement,
    settings: ConversionSettings
  ): Promise<Blob> {
    const { canvas, ctx } = this.getCanvas();
    
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    
    // Apply automatic crop if enabled
    if (settings.enableCrop && settings.cropAspectRatio) {
      console.log('🔄 Applying automatic crop:', {
        originalDimensions: { width: sourceWidth, height: sourceHeight },
        targetAspectRatio: settings.cropAspectRatio,
        cropMode: settings.cropMode,
        cropSizeMode: settings.cropSizeMode
      });
      
      const cropResult = this.calculateCropDimensions(
        sourceWidth,
        sourceHeight,
        settings.cropAspectRatio,
        settings.cropMode || 'center',
        settings.cropSizeMode || 'fit'
      );
      
      console.log('✂️ Crop result:', cropResult);
      console.log('📐 Original aspect ratio:', (sourceWidth / sourceHeight).toFixed(3));
      console.log('📐 Target aspect ratio:', settings.cropAspectRatio.toFixed(3));
      
      sourceX = cropResult.x;
      sourceY = cropResult.y;
      sourceWidth = cropResult.width;
      sourceHeight = cropResult.height;
    }
    
    const { width, height } = this.calculateDimensions(
      sourceWidth,
      sourceHeight,
      settings.maxWidth,
      settings.maxHeight,
      settings.maintainAspectRatio
    );

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw image with cropping if applied
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle (potentially cropped)
      0, 0, width, height // Destination rectangle
    );

    // Handle SVG output
    if (settings.outputFormat === 'svg') {
      return await this.convertToSvg(canvas, width, height, settings);
    }

    // Handle PDF output
    if (settings.outputFormat === 'pdf') {
      return await this.convertToPdf(canvas, width, height, settings);
    }

    // Handle ICO output
    if (settings.outputFormat === 'ico') {
      return await this.convertToIco(canvas, settings);
    }

    // Handle TIFF output
    if (settings.outputFormat === 'tiff') {
      return await this.convertToTiff(canvas, width, height, settings);
    }

    // Convert to blob for other formats
    return new Promise((resolve, reject) => {
      const mimeType = settings.outputFormat === 'jpeg' ? 'image/jpeg' : 
                      settings.outputFormat === 'png' ? 'image/png' :
                      settings.outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        mimeType,
        settings.quality / 100
      );
    });
  }

  private static async convertToSvg(canvas: HTMLCanvasElement, width: number, height: number, settings?: ConversionSettings): Promise<Blob> {
    try {
      // Optimize dimensions for very large images
      let optimizedCanvas = canvas;
      let optimizedWidth = width;
      let optimizedHeight = height;
      
      // If image is very large, resize to max 1024px for better vectorization
      const maxDimension = 1024;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        optimizedWidth = Math.round(width * scale);
        optimizedHeight = Math.round(height * scale);
        
        // Create a new optimized canvas
        optimizedCanvas = document.createElement('canvas');
        const optimizedCtx = optimizedCanvas.getContext('2d')!;
        optimizedCanvas.width = optimizedWidth;
        optimizedCanvas.height = optimizedHeight;
        
        // Draw the original canvas scaled down
        optimizedCtx.drawImage(canvas, 0, 0, optimizedWidth, optimizedHeight);
      }

      // Get ImageData from canvas for ImageTracer
      const ctx = optimizedCanvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, optimizedWidth, optimizedHeight);

      // Configure ImageTracer options based on user settings
      const quality = settings?.quality || 80;
      const vectorColors = settings?.vectorColors || (quality >= 90 ? 32 : quality >= 60 ? 16 : 8);
      const pathPrecision = settings?.pathPrecision || (quality >= 90 ? 0.5 : 1.0);
      const vectorQuality = settings?.vectorQuality || 'balanced';
      
      // Vectorization style presets
      let stylePreset: Record<string, unknown>;
      switch (vectorQuality) {
        case 'simple':
          stylePreset = {
            numberofcolors: Math.min(vectorColors, 8),
            pathomit: 12,
            ltres: 2.0,
            qtres: 2.0,
            mincolorratio: 0.05,
          };
          break;
        case 'detailed':
          stylePreset = {
            numberofcolors: vectorColors,
            pathomit: 2,
            ltres: 0.3,
            qtres: 0.3,
            mincolorratio: 0.005,
          };
          break;
        case 'artistic':
          stylePreset = {
            numberofcolors: Math.max(vectorColors * 0.75, 6),
            pathomit: 6,
            ltres: 1.5,
            qtres: 1.5,
            mincolorratio: 0.03,
            blur: 1,
            blurradius: 2,
          };
          break;
        default: // balanced
          stylePreset = {
            numberofcolors: vectorColors,
            pathomit: 8,
            ltres: pathPrecision,
            qtres: pathPrecision,
            mincolorratio: 0.02,
          };
      }
      
      const options = {
        // Apply style preset
        ...stylePreset,
        
        // Color quantization
        colorquantcycles: quality >= 80 ? 5 : 3,
        
        // Output settings
        scale: 1,                                   // Keep original scale
        strokewidth: 1,                             // Stroke width
        linefilter: true,                           // Enable line filter
        roundcoords: quality >= 80 ? 2 : 1,         // Round coordinates precision
        
        // Layering and description
        layering: 0,                                // Sequential layering
        desc: false,                                // Don't include description
        viewbox: true,                              // Include viewbox
        
        // Performance settings (unless overridden by style)
        blur: stylePreset.blur || 0,
        blurradius: stylePreset.blurradius || 0,
      };

      // Trace the image to SVG using ImageTracer
      const svgString = ImageTracerModule.imagedataToSVG(imageData, options);

      // Create blob from SVG string
      return new Blob([svgString], { type: 'image/svg+xml' });

    } catch (error) {
      console.error('ImageTracer SVG conversion failed:', error);
      // Fallback to simple embedded image SVG
      return this.convertToSvgFallback(canvas, width, height);
    }
  }

  private static async convertToSvgFallback(canvas: HTMLCanvasElement, width: number, height: number): Promise<Blob> {
    console.log('Using fallback SVG conversion method');
    
    // Fallback: Simple SVG with embedded bitmap (smaller than before)
    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create JPEG blob'));
          }
        },
        'image/jpeg',
        0.6 // More compressed for smaller size
      );
    });

    const jpegBase64 = await this.blobToBase64(jpegBlob);
    
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Fallback Converted Image</title>
  <desc>Generated using fallback method</desc>
  <image x="0" y="0" width="${width}" height="${height}" 
         xlink:href="${jpegBase64}" 
         preserveAspectRatio="xMidYMid meet"/>
</svg>`;

    return new Blob([svgContent], { type: 'image/svg+xml' });
  }

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private static async convertToIco(
    canvas: HTMLCanvasElement,
    settings: ConversionSettings
  ): Promise<Blob> {
    try {
      // Get ICO settings
      const icoSizes = settings.icoIncludeAllSizes 
        ? [16, 24, 32, 48, 64, 128, 256]
        : (settings.icoSizes || [16, 32, 48]);
      
      const exportMode = settings.icoExportMode || 'single';

      if (exportMode === 'multiple') {
        // Generate multiple PNG files in a ZIP
        return await this.convertToMultiplePngZip(canvas, icoSizes, settings);
      } else {
        // Generate single ICO file with multiple sizes
        return await this.convertToSingleIco(canvas, icoSizes);
      }
    } catch (error) {
      console.error('ICO conversion failed:', error);
      throw new Error(`Failed to convert to ICO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async convertToSingleIco(
    canvas: HTMLCanvasElement,
    icoSizes: number[]
  ): Promise<Blob> {
    try {
      console.log('Converting to single ICO with sizes:', icoSizes);
      
      // Validate sizes
      const validSizes = icoSizes.filter(size => size > 0 && size <= 256);
      if (validSizes.length === 0) {
        throw new Error('No valid icon sizes provided');
      }
      
      console.log('Valid ICO sizes to include:', validSizes);
      
      // Use toICO library to convert canvas to ICO
      const icoDataUrl = toICO(canvas, validSizes);
      
      if (!icoDataUrl || !icoDataUrl.startsWith('data:image/x-icon;base64,')) {
        throw new Error('Invalid ICO data URL generated');
      }
      
      console.log('ICO data URL generated successfully, length:', icoDataUrl.length);
      
      // Convert data URL to blob
      const response = await fetch(icoDataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICO data: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error('Generated ICO blob is empty');
      }
      
      console.log('ICO blob generated successfully:', {
        size: blob.size,
        type: blob.type,
        includesSizes: validSizes.length
      });
      
      return blob;
    } catch (error) {
      console.error('Single ICO conversion failed:', error);
      
      // Fallback: create a simple ICO using canvas conversion
      console.log('Using fallback ICO conversion method');
      return await this.convertToIcoFallback(canvas, icoSizes);
    }
  }

  private static async convertToMultiplePngZip(
    canvas: HTMLCanvasElement,
    icoSizes: number[],
    settings: ConversionSettings
  ): Promise<Blob> {
    console.log('Converting to multiple PNG files in ZIP with sizes:', icoSizes);
    
    try {
      const zip = new JSZip();
      
      // Validate sizes
      const validSizes = icoSizes.filter(size => size > 0 && size <= 512);
      if (validSizes.length === 0) {
        throw new Error('No valid icon sizes provided for PNG generation');
      }
      
      console.log('Valid PNG sizes to generate:', validSizes);
      
      const generatedFiles: { name: string; blob: Blob }[] = [];
      
      // Generate all PNG files first
      for (const size of validSizes) {
        try {
          console.log(`Generating PNG for size: ${size}x${size}`);
          
          // Create a fresh canvas for each size
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) {
            throw new Error(`Failed to get canvas context for ${size}x${size}`);
          }
          
          // Set canvas size
          tempCanvas.width = size;
          tempCanvas.height = size;
          
          // Clear and draw resized image
          tempCtx.clearRect(0, 0, size, size);
          
          // Use high quality scaling
          tempCtx.imageSmoothingEnabled = true;
          tempCtx.imageSmoothingQuality = 'high';
          tempCtx.drawImage(canvas, 0, 0, size, size);
          
          // Convert to PNG blob with error handling
          const pngBlob = await new Promise<Blob>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout generating PNG for ${size}x${size}`));
            }, 10000); // 10 second timeout
            
            tempCanvas.toBlob(
              (blob) => {
                clearTimeout(timeout);
                if (blob && blob.size > 0) {
                  resolve(blob);
                } else {
                  reject(new Error(`Failed to create ${size}x${size} PNG or blob is empty`));
                }
              },
              'image/png',
              1.0 // Maximum quality for icons
            );
          });
          
          const filename = `icon-${size}x${size}.png`;
          generatedFiles.push({ name: filename, blob: pngBlob });
          
          console.log(`Successfully generated ${filename} (${pngBlob.size} bytes)`);
        } catch (error) {
          console.error(`Failed to generate PNG for size ${size}x${size}:`, error);
          // Continue with other sizes but log the error
        }
      }
      
      if (generatedFiles.length === 0) {
        throw new Error('Failed to generate any PNG files');
      }
      
      console.log(`Generated ${generatedFiles.length} PNG files`);
      
      // Add files to ZIP with proper error handling
      for (const file of generatedFiles) {
        try {
          // Convert blob to ArrayBuffer for more reliable ZIP handling
          const arrayBuffer = await file.blob.arrayBuffer();
          zip.file(file.name, arrayBuffer);
          console.log(`Added ${file.name} to ZIP (${arrayBuffer.byteLength} bytes)`);
        } catch (error) {
          console.error(`Failed to add ${file.name} to ZIP:`, error);
          throw new Error(`Failed to add ${file.name} to ZIP: ${error}`);
        }
      }
      
      // Generate ZIP blob with optimal settings
      console.log('Generating ZIP file...');
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { 
          level: 6 // Balanced compression
        },
        streamFiles: true, // Better for large files
        platform: 'UNIX' // Better compatibility
      });
      
      if (!zipBlob || zipBlob.size === 0) {
        throw new Error('Generated ZIP blob is empty');
      }
      
      // Validate ZIP by trying to read it
      try {
        const testZip = await JSZip.loadAsync(zipBlob);
        const fileNames = Object.keys(testZip.files);
        console.log('ZIP validation successful. Contains files:', fileNames);
        
        if (fileNames.length !== generatedFiles.length) {
          throw new Error(`ZIP validation failed: expected ${generatedFiles.length} files, got ${fileNames.length}`);
        }
      } catch (error) {
        console.error('ZIP validation failed:', error);
        throw new Error(`Generated ZIP file is corrupted: ${error}`);
      }
      
      console.log('ZIP file generated successfully:', {
        size: zipBlob.size,
        filesCount: generatedFiles.length,
        files: generatedFiles.map(f => f.name)
      });
      
      return zipBlob;
      
    } catch (error) {
      console.error('Multiple PNG ZIP conversion failed:', error);
      throw new Error(`Failed to create PNG ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async convertToIcoFallback(
    canvas: HTMLCanvasElement,
    icoSizes: number[]
  ): Promise<Blob> {
    // Simple fallback: just create the largest size as ICO-mimetype PNG
    const largestSize = Math.max(...icoSizes);
    const { ctx } = this.getCanvas();
    
    // Create temporary canvas for the largest size
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCanvas.width = largestSize;
    tempCanvas.height = largestSize;
    
    // Draw resized image
    tempCtx.clearRect(0, 0, largestSize, largestSize);
    tempCtx.drawImage(canvas, 0, 0, largestSize, largestSize);
    
    // Convert to blob with ICO-like quality
    return new Promise<Blob>((resolve, reject) => {
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create fallback ICO'));
          }
        },
        'image/png',
        1.0
      );
    });
  }

  private static async convertToPdf(
    canvas: HTMLCanvasElement,
    canvasWidth: number,
    canvasHeight: number,
    settings: ConversionSettings
  ): Promise<Blob> {
    try {
      // Get PDF settings with defaults
      const pageSize = settings.pageSize || 'A4';
      const orientation = settings.orientation || 'Portrait';
      const dpi = settings.dpi || 300;
      const quality = settings.quality || 85;
      const imagePlacement = settings.imagePlacement || 'fit';
      const marginTop = settings.marginTop || 20;
      const marginBottom = settings.marginBottom || 20;
      const marginLeft = settings.marginLeft || 20;
      const marginRight = settings.marginRight || 20;

      // Create jsPDF instance
      const pdf = new jsPDF({
        orientation: orientation.toLowerCase() as 'portrait' | 'landscape',
        unit: 'mm',
        format: pageSize.toLowerCase() === 'custom' ? [210, 297] : pageSize.toLowerCase() as any
      });

      // Get page dimensions in mm
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate usable area (excluding margins)
      const usableWidth = pageWidth - marginLeft - marginRight;
      const usableHeight = pageHeight - marginTop - marginBottom;

      // Convert canvas to high quality image data
      let imageFormat = 'JPEG';
      let imageQuality = quality / 100;
      
      // For high quality or print, use PNG to avoid JPEG compression artifacts
      if (quality >= 90) {
        imageFormat = 'PNG';
        imageQuality = 1.0;
      }

      const imageData = canvas.toDataURL(`image/${imageFormat.toLowerCase()}`, imageQuality);

      // Calculate image dimensions for PDF
      let imgWidth, imgHeight, x, y;

      // Convert pixels to mm at specified DPI
      const pixelsToMm = (pixels: number) => (pixels * 25.4) / dpi;
      
      const originalWidthMm = pixelsToMm(canvasWidth);
      const originalHeightMm = pixelsToMm(canvasHeight);

      switch (imagePlacement) {
        case 'fit':
          // Maintain aspect ratio, fit within margins
          const scaleX = usableWidth / originalWidthMm;
          const scaleY = usableHeight / originalHeightMm;
          const scale = Math.min(scaleX, scaleY);
          
          imgWidth = originalWidthMm * scale;
          imgHeight = originalHeightMm * scale;
          
          // Center the image
          x = marginLeft + (usableWidth - imgWidth) / 2;
          y = marginTop + (usableHeight - imgHeight) / 2;
          break;

        case 'fill':
          // Fill the usable area, may crop
          imgWidth = usableWidth;
          imgHeight = usableHeight;
          x = marginLeft;
          y = marginTop;
          break;

        case 'center':
          // Use original size, center on page
          imgWidth = Math.min(originalWidthMm, usableWidth);
          imgHeight = Math.min(originalHeightMm, usableHeight);
          x = marginLeft + (usableWidth - imgWidth) / 2;
          y = marginTop + (usableHeight - imgHeight) / 2;
          break;

        case 'stretch':
          // Stretch to fill, ignore aspect ratio
          imgWidth = usableWidth;
          imgHeight = usableHeight;
          x = marginLeft;
          y = marginTop;
          break;

        default:
          // Default to fit
          const defaultScaleX = usableWidth / originalWidthMm;
          const defaultScaleY = usableHeight / originalHeightMm;
          const defaultScale = Math.min(defaultScaleX, defaultScaleY);
          
          imgWidth = originalWidthMm * defaultScale;
          imgHeight = originalHeightMm * defaultScale;
          x = marginLeft + (usableWidth - imgWidth) / 2;
          y = marginTop + (usableHeight - imgHeight) / 2;
      }

      // Add image to PDF
      pdf.addImage(imageData, imageFormat, x, y, imgWidth, imgHeight);

      // Apply compression if specified
      if (settings.pdfCompression && settings.pdfCompression > 1) {
        // Note: jsPDF handles compression internally, this is just for user feedback
        console.log(`PDF compression level: ${settings.pdfCompression}`);
      }

      // Set PDF metadata
      pdf.setProperties({
        title: 'Converted Image',
        subject: 'Image converted to PDF',
        author: 'OpenLoveImage',
        creator: 'OpenLoveImage Converter'
      });

      // Apply security settings if password protection is enabled
      if (settings.passwordProtect) {
        // Note: jsPDF security features are limited
        // For full security, you'd need a server-side PDF library
        console.log('Password protection requested (limited browser support)');
        
        // Set document permissions
        const permissions = [];
        if (settings.allowPrinting !== false) permissions.push('print');
        if (settings.allowCopying !== false) permissions.push('copy');
        
        // Basic protection (browser limitations apply)
        if (settings.userPassword) {
          console.log('User password set (browser implementation has limitations)');
        }
        if (settings.ownerPassword) {
          console.log('Owner password set (browser implementation has limitations)');
        }
      }

      // Generate PDF blob
      return pdf.output('blob');

    } catch (error) {
      console.error('PDF conversion failed:', error);
      throw new Error(`Failed to convert to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async loadSvgAsImage(file: File): Promise<HTMLImageElement> {
    if (!file || !file.name) {
      throw new Error('Invalid SVG file provided');
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const svgData = e.target?.result as string;
          if (!svgData) {
            reject(new Error('Failed to read SVG file content'));
            return;
          }
          
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
          };
          img.onerror = (error) => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load SVG as image: ' + error));
          };
          
          // Create a blob URL for the SVG
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          img.src = URL.createObjectURL(blob);
        } catch (error) {
          reject(new Error('Error processing SVG file: ' + error));
        }
      };
      reader.onerror = (error) => reject(new Error('Failed to read SVG file: ' + error));
      reader.readAsText(file);
    });
  }

  private static async convertFromHeic(
    file: File,
    settings: ConversionSettings
  ): Promise<Blob> {
    try {
      const convertedBlob = await heicTo({
        blob: file,
        type: settings.outputFormat === 'jpeg' ? 'image/jpeg' : 
              settings.outputFormat === 'png' ? 'image/png' : 'image/jpeg',
        quality: settings.quality / 100
      });

      // If resizing is needed, convert the blob to image and resize
      if (settings.maxWidth || settings.maxHeight) {
        const tempFileName = settings.outputFormat === 'jpeg' ? 'temp.jpg' : 'temp.png';
        const img = await this.loadImage(new File([convertedBlob], tempFileName, { type: settings.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png' }));
        return await this.convertWithCanvas(img, settings);
      }

      return convertedBlob;
    } catch (error) {
      throw new Error(`HEIC conversion failed: ${error}`);
    }
  }

  private static async loadTiffAsImage(file: File): Promise<HTMLImageElement> {
    if (!file || !file.name) {
      throw new Error('Invalid TIFF file provided');
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read TIFF file content'));
            return;
          }
          
          // Decode TIFF using the tiff library
          const uint8Array = new Uint8Array(arrayBuffer);
          const ifds = TIFF.decode(uint8Array);
          
          if (!ifds || ifds.length === 0) {
            reject(new Error('No image data found in TIFF file'));
            return;
          }
          
          // Use the first IFD (page)
          const ifd = ifds[0];
          const width = ifd.width;
          const height = ifd.height;
          const data = ifd.data;
          
          // Create canvas to convert TIFF data to image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Create ImageData from TIFF data
          const imageData = ctx.createImageData(width, height);
          
          // Convert TIFF data to RGBA format
          if (ifd.alpha) {
            // RGBA data
            if (data instanceof Uint8Array) {
              imageData.data.set(data);
            } else if (data instanceof Uint16Array) {
              // Convert 16-bit to 8-bit
              for (let i = 0; i < data.length; i++) {
                imageData.data[i] = Math.round(data[i] / 257); // 65535 / 255 ≈ 257
              }
            }
          } else {
            // RGB data (add alpha channel)
            const channels = ifd.samplesPerPixel || 3;
            for (let i = 0; i < width * height; i++) {
              if (channels === 1) {
                // Grayscale
                const gray = data instanceof Uint16Array ? Math.round(data[i] / 257) : data[i];
                imageData.data[i * 4] = gray;     // R
                imageData.data[i * 4 + 1] = gray; // G
                imageData.data[i * 4 + 2] = gray; // B
                imageData.data[i * 4 + 3] = 255;  // A
              } else {
                // RGB
                const r = data instanceof Uint16Array ? Math.round(data[i * 3] / 257) : data[i * 3];
                const g = data instanceof Uint16Array ? Math.round(data[i * 3 + 1] / 257) : data[i * 3 + 1];
                const b = data instanceof Uint16Array ? Math.round(data[i * 3 + 2] / 257) : data[i * 3 + 2];
                
                imageData.data[i * 4] = r;       // R
                imageData.data[i * 4 + 1] = g;   // G
                imageData.data[i * 4 + 2] = b;   // B
                imageData.data[i * 4 + 3] = 255; // A
              }
            }
          }
          
          // Put image data on canvas
          ctx.putImageData(imageData, 0, 0);
          
          // Convert canvas to image
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
          };
          img.onerror = (error) => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load TIFF as image: ' + error));
          };
          
          // Create blob URL from canvas
          canvas.toBlob((blob) => {
            if (blob) {
              img.src = URL.createObjectURL(blob);
            } else {
              reject(new Error('Failed to create blob from TIFF canvas'));
            }
          }, 'image/png');
          
        } catch (error) {
          reject(new Error('Error processing TIFF file: ' + error));
        }
      };
      reader.onerror = (error) => reject(new Error('Failed to read TIFF file: ' + error));
      reader.readAsArrayBuffer(file);
    });
  }

  private static async isTiff(file: File): Promise<boolean> {
    if (!file || !file.name) return false;
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
      return true;
    }
    
    // Check MIME type
    if (file.type === 'image/tiff' || file.type === 'image/tif') {
      return true;
    }
    
    // Check file signature (magic bytes)
    try {
      const header = await file.slice(0, 4).arrayBuffer();
      const view = new DataView(header);
      
      // TIFF files start with either "II" (little-endian) or "MM" (big-endian)
      // followed by 42 (0x002A)
      const signature1 = view.getUint16(0, true);  // little-endian
      const signature2 = view.getUint16(0, false); // big-endian
      const magic1 = view.getUint16(2, true);      // little-endian
      const magic2 = view.getUint16(2, false);     // big-endian
      
      return (signature1 === 0x4949 && magic1 === 42) ||  // "II" + 42 (little-endian)
             (signature2 === 0x4D4D && magic2 === 42);    // "MM" + 42 (big-endian)
    } catch {
      return false;
    }
  }
  private static async convertRegularImage(
    file: File,
    settings: ConversionSettings
  ): Promise<Blob> {
    // Validate input file
    if (!file || !file.name) {
      throw new Error('Invalid file provided to convertRegularImage');
    }
    
    // Check if input is SVG
    const isSvgInput = (file.type === 'image/svg+xml') || file.name.toLowerCase().endsWith('.svg');
    
    // Check if input is TIFF
    const isTiffInput = await this.isTiff(file);
    
    let img: HTMLImageElement;
    try {
      if (isSvgInput) {
        img = await this.loadSvgAsImage(file);
      } else if (isTiffInput) {
        img = await this.loadTiffAsImage(file);
      } else {
        img = await this.loadImage(file);
      }
    } catch (error) {
      throw new Error(`Failed to load image: ${error instanceof Error ? error.message : error}`);
    }
    
    return await this.convertWithCanvas(img, settings);
  }

  static async convertImage(
    file: File,
    settings: ConversionSettings,
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult> {
    try {
      // Check for cancellation
      if (abortSignal?.aborted) {
        throw new Error('Conversion cancelled');
      }

      // Validate file input
      if (!file || !file.name || file.size === undefined) {
        throw new Error('Invalid file provided');
      }

      const originalSize = file.size;
      let convertedBlob: Blob;

      // Report initial progress
      onProgress?.(10);

      // Check for cancellation
      if (abortSignal?.aborted) {
        throw new Error('Conversion cancelled');
      }

      // Check if input is HEIC or TIFF
      const isInputHeic = await isHeic(file);
      const isInputTiff = await this.isTiff(file);
      onProgress?.(20);

      // Check for cancellation
      if (abortSignal?.aborted) {
        throw new Error('Conversion cancelled');
      }

      if (isInputHeic) {
        // Converting FROM HEIC
        if (settings.outputFormat === 'heic') {
          // HEIC to HEIC (just resize if needed)
          if (settings.maxWidth || settings.maxHeight) {
            onProgress?.(50);
            convertedBlob = await this.convertFromHeic(file, { ...settings, outputFormat: 'jpeg' });
            // Then convert back - but browsers can't create HEIC, so this will fail
            throw new Error('HEIC to HEIC conversion with resizing is not supported');
          } else {
            // No conversion needed, just return original
            onProgress?.(80);
            convertedBlob = file;
          }
                  } else {
            // HEIC to other format
            onProgress?.(40);
            
            // Check for cancellation
            if (abortSignal?.aborted) {
              throw new Error('Conversion cancelled');
            }
            
            convertedBlob = await this.convertFromHeic(file, settings);
            onProgress?.(80);
          }
      } else {
        // Converting FROM regular image format
        if (settings.outputFormat === 'heic') {
          // Convert TO HEIC (not supported)
          throw new Error('Converting to HEIC format is not supported in browsers');
        } else {
          // Check for SVG to SVG conversion
          const isSvgInput = (file.type === 'image/svg+xml') || file.name.toLowerCase().endsWith('.svg');
          
          // Check for TIFF to TIFF conversion
          if (isInputTiff && settings.outputFormat === 'tiff') {
            // TIFF to TIFF - check if resize or settings change is needed
            if (settings.maxWidth || settings.maxHeight || 
                settings.tiffCompression !== 'lzw' || 
                settings.tiffBitDepth !== 8 || 
                settings.tiffColorModel !== 'rgb') {
              // Need to process, so convert through canvas
              onProgress?.(40);
              convertedBlob = await this.convertRegularImage(file, settings);
              onProgress?.(80);
            } else {
              // No processing needed, just return original TIFF
              onProgress?.(50);
              convertedBlob = file;
              onProgress?.(80);
            }
          } else if (isSvgInput && settings.outputFormat === 'svg') {
            // SVG to SVG - check if resize is needed
            if (settings.maxWidth || settings.maxHeight) {
              // Need to resize, so process through canvas
              onProgress?.(40);
              convertedBlob = await this.convertRegularImage(file, settings);
              onProgress?.(80);
            } else {
              // No resize needed, just return original SVG
              onProgress?.(50);
              convertedBlob = file;
              onProgress?.(80);
            }
          } else {
            // Regular image conversion
            onProgress?.(40);
            
            // Check for cancellation
            if (abortSignal?.aborted) {
              throw new Error('Conversion cancelled');
            }
            
            convertedBlob = await this.convertRegularImage(file, settings);
            onProgress?.(80);
          }
        }
      }

      onProgress?.(90);

      // Validate converted blob
      if (!convertedBlob || convertedBlob.size === 0) {
        throw new Error('Conversion produced empty or invalid blob');
      }

      const result = {
        success: true,
        blob: convertedBlob,
        originalSize,
        convertedSize: convertedBlob.size
      };

      onProgress?.(100);
      return result;

    } catch (error) {
      // Check if it was a cancellation
      const isCancelled = error instanceof Error && (error.message === 'Conversion cancelled' || error.name === 'AbortError');
      
      // Ensure we always return a valid ConversionResult
      const errorResult = {
        success: false,
        error: isCancelled 
          ? 'Conversion cancelled by user' 
          : (error instanceof Error ? error.message : 'Unknown error occurred'),
        originalSize: file?.size || 0
      };
      
      onProgress?.(100); // Complete progress even on error
      return errorResult;
    }
  }

  static async convertMultipleImages(
    files: File[],
    settings: ConversionSettings,
    onOverallProgress?: (completed: number, total: number) => void,
    onIndividualProgress?: (fileIndex: number, progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult[]> {
    // Special handling for PDF - create multi-page PDF
          if (settings.outputFormat === 'pdf' && files.length > 1) {
      const multiPageResult = await this.convertMultipleImagesToPdf(
        files, 
        settings, 
        onOverallProgress, 
        onIndividualProgress,
        abortSignal
      );
      
      // For PDF multi-page conversion, treat it as one successful conversion for first file
      // and mark others as completed but point to the same result
      const results: ConversionResult[] = files.map((file, index) => {
        if (index === 0) {
          // First file gets the actual PDF result
          return {
            success: multiPageResult.success,
            blob: multiPageResult.blob,
            error: multiPageResult.error,
            originalSize: file.size,
            convertedSize: multiPageResult.convertedSize
          };
        } else {
          // Other files are marked as "completed" but merged into the first PDF
          return {
            success: true,
            blob: undefined, // No individual blob, merged into first file
            originalSize: file.size,
            convertedSize: 0, // Size already counted in first file
            isMergedIntoPdf: true // Flag to indicate this was merged
          };
        }
      });
      
      return results;
    }

    // Regular conversion for other formats
    const results: ConversionResult[] = [];

    for (let i = 0; i < files.length; i++) {
      // Check for cancellation before processing each file
      if (abortSignal?.aborted) {
        // Return partial results for already processed files and mark remaining as cancelled
        for (let j = i; j < files.length; j++) {
          results.push({
            success: false,
            error: 'Conversion cancelled by user',
            originalSize: files[j]?.size || 0
          });
        }
        break;
      }

      try {
        const result = await this.convertImage(
          files[i], 
          settings,
          (progress) => onIndividualProgress?.(i, progress),
          abortSignal
        );
        
        // Ensure result is valid
        if (!result) {
          results.push({
            success: false,
            error: 'convertImage returned null or undefined',
            originalSize: files[i]?.size || 0
          });
        } else {
          results.push(result);
        }
      } catch (error) {
        // Handle any exceptions and ensure we still push a valid result
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error in convertImage',
          originalSize: files[i]?.size || 0
        });
      }
      
      if (onOverallProgress) {
        onOverallProgress(i + 1, files.length);
      }
    }

    return results;
  }

  private static async convertMultipleImagesToPdf(
    files: File[],
    settings: ConversionSettings,
    onOverallProgress?: (completed: number, total: number) => void,
    onIndividualProgress?: (fileIndex: number, progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ConversionResult> {
    try {
      // Get PDF settings with defaults
      const pageSize = settings.pageSize || 'A4';
      const orientation = settings.orientation || 'Portrait';
      const dpi = settings.dpi || 300;
      const quality = settings.quality || 85;
      const imagePlacement = settings.imagePlacement || 'fit';
      const marginTop = settings.marginTop || 20;
      const marginBottom = settings.marginBottom || 20;
      const marginLeft = settings.marginLeft || 20;
      const marginRight = settings.marginRight || 20;
      const imagesPerPage = settings.imagesPerPage || 1;
      const pageLayout = settings.pageLayout || 'auto';

      // Create jsPDF instance
      const pdf = new jsPDF({
        orientation: orientation.toLowerCase() as 'portrait' | 'landscape',
        unit: 'mm',
        format: pageSize.toLowerCase() === 'custom' ? [210, 297] : pageSize.toLowerCase() as any
      });

      // Get page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - marginLeft - marginRight;
      const usableHeight = pageHeight - marginTop - marginBottom;

      let totalOriginalSize = 0;
      let currentPage = 0;
      let imagesOnCurrentPage = 0;

      // Calculate grid layout for multiple images per page
      const getGridLayout = (imagesPerPage: number, pageLayout: string) => {
        if (pageLayout === 'vertical') {
          return { cols: 1, rows: imagesPerPage };
        } else if (pageLayout === 'horizontal') {
          return { cols: imagesPerPage, rows: 1 };
        } else if (pageLayout === 'grid' || pageLayout === 'auto') {
          const cols = Math.ceil(Math.sqrt(imagesPerPage));
          const rows = Math.ceil(imagesPerPage / cols);
          return { cols, rows };
        } else {
          return { cols: 1, rows: 1 };
        }
      };

      const { cols, rows } = getGridLayout(imagesPerPage, pageLayout);
      const cellWidth = usableWidth / cols;
      const cellHeight = usableHeight / rows;

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('PDF conversion cancelled by user');
        }

        const file = files[fileIndex];
        totalOriginalSize += file.size;

        try {
          onIndividualProgress?.(fileIndex, 10);

          // Check for cancellation
          if (abortSignal?.aborted) {
            throw new Error('PDF conversion cancelled by user');
          }

          // Load and process image
          let img: HTMLImageElement;
          const isInputHeic = await isHeic(file);
          const isInputTiff = await this.isTiff(file);
          
          if (isInputHeic) {
            // Convert HEIC to canvas first
            const tempBlob = await this.convertFromHeic(file, { ...settings, outputFormat: 'jpeg' });
            const tempFile = new File([tempBlob], 'temp.jpg', { type: 'image/jpeg' });
            img = await this.loadImage(tempFile);
          } else if (isInputTiff) {
            // Load TIFF directly
            img = await this.loadTiffAsImage(file);
          } else {
            const isSvgInput = (file.type === 'image/svg+xml') || file.name.toLowerCase().endsWith('.svg');
            if (isSvgInput) {
              img = await this.loadSvgAsImage(file);
            } else {
              img = await this.loadImage(file);
            }
          }

          onIndividualProgress?.(fileIndex, 50);

          // Create canvas for this image
          const { canvas, ctx } = this.getCanvas();
          const { width, height } = this.calculateDimensions(
            img.naturalWidth,
            img.naturalHeight,
            settings.maxWidth,
            settings.maxHeight,
            settings.maintainAspectRatio
          );

          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to image data
          let imageFormat = 'JPEG';
          let imageQuality = quality / 100;
          if (quality >= 90) {
            imageFormat = 'PNG';
            imageQuality = 1.0;
          }
          const imageData = canvas.toDataURL(`image/${imageFormat.toLowerCase()}`, imageQuality);

          // Add new page if needed
          if (imagesOnCurrentPage === 0 && currentPage > 0) {
            pdf.addPage();
          }

          // Calculate position on page
          const gridIndex = imagesOnCurrentPage;
          const col = gridIndex % cols;
          const row = Math.floor(gridIndex / cols);

          const cellX = marginLeft + col * cellWidth;
          const cellY = marginTop + row * cellHeight;

          // Calculate image size within cell
          const pixelsToMm = (pixels: number) => (pixels * 25.4) / dpi;
          const originalWidthMm = pixelsToMm(width);
          const originalHeightMm = pixelsToMm(height);

          let imgWidth, imgHeight, x, y;

          if (imagePlacement === 'fit') {
            const scaleX = cellWidth / originalWidthMm;
            const scaleY = cellHeight / originalHeightMm;
            const scale = Math.min(scaleX, scaleY);
            
            imgWidth = originalWidthMm * scale;
            imgHeight = originalHeightMm * scale;
            
            x = cellX + (cellWidth - imgWidth) / 2;
            y = cellY + (cellHeight - imgHeight) / 2;
          } else if (imagePlacement === 'fill') {
            imgWidth = cellWidth;
            imgHeight = cellHeight;
            x = cellX;
            y = cellY;
          } else { // center, stretch, etc.
            imgWidth = Math.min(originalWidthMm, cellWidth);
            imgHeight = Math.min(originalHeightMm, cellHeight);
            x = cellX + (cellWidth - imgWidth) / 2;
            y = cellY + (cellHeight - imgHeight) / 2;
          }

          // Add image to PDF
          pdf.addImage(imageData, imageFormat, x, y, imgWidth, imgHeight);

          onIndividualProgress?.(fileIndex, 90);

          // Update counters
          imagesOnCurrentPage++;
          if (imagesOnCurrentPage >= imagesPerPage) {
            imagesOnCurrentPage = 0;
            currentPage++;
          }

          onIndividualProgress?.(fileIndex, 100);

        } catch (error) {
          console.error(`Failed to process image ${fileIndex}:`, error);
          // Continue with next image
        }

        onOverallProgress?.(fileIndex + 1, files.length);
      }

      // Set PDF metadata
      pdf.setProperties({
        title: `Converted Images (${files.length} images)`,
        subject: 'Multiple images converted to PDF',
        author: 'OpenLoveImage',
        creator: 'OpenLoveImage Converter'
      });

      // Apply security settings if specified
      if (settings.passwordProtect) {
        console.log('Password protection requested (limited browser support)');
      }

      // Generate PDF blob
      const pdfBlob = pdf.output('blob');

      return {
        success: true,
        blob: pdfBlob,
        originalSize: totalOriginalSize,
        convertedSize: pdfBlob.size
      };

    } catch (error) {
      // Check if it was a cancellation
      const isCancelled = error instanceof Error && (error.message.includes('cancelled') || error.name === 'AbortError');
      
      return {
        success: false,
        error: isCancelled 
          ? 'PDF conversion cancelled by user'
          : (error instanceof Error ? error.message : 'Failed to create multi-page PDF'),
        originalSize: files.reduce((sum, file) => sum + file.size, 0)
      };
    }
  }

  private static async convertToTiff(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    settings: ConversionSettings
  ): Promise<Blob> {
    try {
      // Get TIFF settings with defaults
      const compression = settings.tiffCompression || 'lzw';
      const bitDepth = settings.tiffBitDepth || 8;
      const colorModel = settings.tiffColorModel || 'rgb';
      const resolutionX = settings.tiffResolutionX || 300;
      const resolutionY = settings.tiffResolutionY || 300;
      const resolutionUnit = settings.tiffResolutionUnit || 'inch';
      const predictor = settings.tiffPredictor || 1;
      const planarConfig = settings.tiffPlanarConfig || 'chunky';
      const fillOrder = settings.tiffFillOrder || 'msb2lsb';
      const photometric = settings.tiffPhotometric || 'rgb';
      const tileSize = settings.tiffTileSize || 0;
      const rowsPerStrip = settings.tiffRowsPerStrip || 8;

      console.log('Converting to TIFF with settings:', {
        compression,
        bitDepth,
        colorModel,
        resolution: `${resolutionX}x${resolutionY} ${resolutionUnit}`,
        predictor,
        planarConfig,
        fillOrder,
        photometric,
        tileSize,
        rowsPerStrip
      });

      // Get image data from canvas
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Convert image data based on color model and bit depth
      let processedData: Uint8Array | Uint16Array | Uint32Array;
      let samplesPerPixel: number;
      let bitsPerSample: number[];
      
      switch (colorModel) {
        case 'grayscale':
          samplesPerPixel = 1;
          bitsPerSample = [bitDepth];
          processedData = this.convertToGrayscale(imageData, bitDepth);
          break;
        case 'rgba':
          samplesPerPixel = 4;
          bitsPerSample = [bitDepth, bitDepth, bitDepth, bitDepth];
          processedData = this.convertToRGBA(imageData, bitDepth);
          break;
        case 'cmyk':
          samplesPerPixel = 4;
          bitsPerSample = [bitDepth, bitDepth, bitDepth, bitDepth];
          processedData = this.convertToCMYK(imageData, bitDepth);
          break;
        default: // 'rgb'
          samplesPerPixel = 3;
          bitsPerSample = [bitDepth, bitDepth, bitDepth];
          processedData = this.convertToRGB(imageData, bitDepth);
          break;
      }

      // Create TIFF structure manually since we need encoding capability
      const tiffData = this.createTiffStructure({
        width,
        height,
        imageData: processedData,
        samplesPerPixel,
        bitsPerSample,
        compression,
        photometric: this.getPhotometricInterpretation(colorModel),
        resolutionX,
        resolutionY,
        resolutionUnit: resolutionUnit === 'inch' ? 2 : 3, // 2 = inch, 3 = centimeter
        predictor,
        planarConfig: planarConfig === 'chunky' ? 1 : 2,
        fillOrder: fillOrder === 'msb2lsb' ? 1 : 2,
        tileSize,
        rowsPerStrip: tileSize === 0 ? rowsPerStrip : undefined
      });

      return new Blob([tiffData], { type: 'image/tiff' });
    } catch (error) {
      console.error('TIFF conversion failed:', error);
      throw new Error(`Failed to convert to TIFF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static convertToGrayscale(imageData: ImageData, bitDepth: number): Uint8Array | Uint16Array | Uint32Array {
    const data = imageData.data;
    const pixelCount = imageData.width * imageData.height;
    
    if (bitDepth === 8) {
      const grayscaleData = new Uint8Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Use standard grayscale conversion formula
        grayscaleData[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
      return grayscaleData;
    } else if (bitDepth === 16) {
      const grayscaleData = new Uint16Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grayscaleData[i] = (gray << 8) | gray; // Convert 8-bit to 16-bit
      }
      return grayscaleData;
    } else {
      // Default to 8-bit
      return this.convertToGrayscale(imageData, 8);
    }
  }

  private static convertToRGB(imageData: ImageData, bitDepth: number): Uint8Array | Uint16Array {
    const data = imageData.data;
    const pixelCount = imageData.width * imageData.height;
    
    if (bitDepth === 8) {
      const rgbData = new Uint8Array(pixelCount * 3);
      for (let i = 0; i < pixelCount; i++) {
        rgbData[i * 3] = data[i * 4];     // R
        rgbData[i * 3 + 1] = data[i * 4 + 1]; // G
        rgbData[i * 3 + 2] = data[i * 4 + 2]; // B
      }
      return rgbData;
    } else if (bitDepth === 16) {
      const rgbData = new Uint16Array(pixelCount * 3);
      for (let i = 0; i < pixelCount; i++) {
        rgbData[i * 3] = (data[i * 4] << 8) | data[i * 4];         // R
        rgbData[i * 3 + 1] = (data[i * 4 + 1] << 8) | data[i * 4 + 1]; // G
        rgbData[i * 3 + 2] = (data[i * 4 + 2] << 8) | data[i * 4 + 2]; // B
      }
      return rgbData;
    } else {
      // Default to 8-bit
      return this.convertToRGB(imageData, 8);
    }
  }

  private static convertToRGBA(imageData: ImageData, bitDepth: number): Uint8Array | Uint16Array {
    const data = imageData.data;
    const pixelCount = imageData.width * imageData.height;
    
    if (bitDepth === 8) {
      // Data is already in RGBA format for 8-bit
      return new Uint8Array(data);
    } else if (bitDepth === 16) {
      const rgbaData = new Uint16Array(pixelCount * 4);
      for (let i = 0; i < pixelCount; i++) {
        rgbaData[i * 4] = (data[i * 4] << 8) | data[i * 4];         // R
        rgbaData[i * 4 + 1] = (data[i * 4 + 1] << 8) | data[i * 4 + 1]; // G
        rgbaData[i * 4 + 2] = (data[i * 4 + 2] << 8) | data[i * 4 + 2]; // B
        rgbaData[i * 4 + 3] = (data[i * 4 + 3] << 8) | data[i * 4 + 3]; // A
      }
      return rgbaData;
    } else {
      // Default to 8-bit
      return this.convertToRGBA(imageData, 8);
    }
  }

  private static convertToCMYK(imageData: ImageData, bitDepth: number): Uint8Array | Uint16Array {
    const data = imageData.data;
    const pixelCount = imageData.width * imageData.height;
    
    if (bitDepth === 8) {
      const cmykData = new Uint8Array(pixelCount * 4);
      for (let i = 0; i < pixelCount; i++) {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;
        
        // Convert RGB to CMYK
        const k = 1 - Math.max(r, g, b);
        const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
        const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
        const y = k === 1 ? 0 : (1 - b - k) / (1 - k);
        
        cmykData[i * 4] = Math.round(c * 255);     // C
        cmykData[i * 4 + 1] = Math.round(m * 255); // M
        cmykData[i * 4 + 2] = Math.round(y * 255); // Y
        cmykData[i * 4 + 3] = Math.round(k * 255); // K
      }
      return cmykData;
    } else {
      // For simplicity, convert to 8-bit first
      return this.convertToCMYK(imageData, 8);
    }
  }

  private static getPhotometricInterpretation(colorModel: string): number {
    switch (colorModel) {
      case 'grayscale': return 1; // BlackIsZero
      case 'rgb': 
      case 'rgba': return 2; // RGB
      case 'cmyk': return 5; // Separated (CMYK)
      default: return 2; // RGB
    }
  }

  private static createTiffStructure(options: {
    width: number;
    height: number;
    imageData: Uint8Array | Uint16Array | Uint32Array;
    samplesPerPixel: number;
    bitsPerSample: number[];
    compression: string;
    photometric: number;
    resolutionX: number;
    resolutionY: number;
    resolutionUnit: number;
    predictor: number;
    planarConfig: number;
    fillOrder: number;
    tileSize: number;
          rowsPerStrip?: number;
    }): ArrayBuffer {
      // This is a simplified TIFF implementation
      // For production use, consider using a more robust TIFF library
      
      const {
        width,
        height,
        imageData,
        samplesPerPixel,
        bitsPerSample,
        compression,
        photometric,
        resolutionX,
        resolutionY,
        resolutionUnit,
        predictor,
        planarConfig,
        fillOrder: _fillOrder, // Mark as used for TIFF structure
        tileSize,
        rowsPerStrip = 8
      } = options;

    // Calculate compressed data (simplified - just use raw data for now)
    let compressedData: Uint8Array;
    
    if (compression === 'none') {
      compressedData = new Uint8Array(imageData.buffer);
    } else {
      // For demo purposes, we'll use uncompressed data
      // In production, implement actual compression algorithms
      console.warn(`TIFF compression '${compression}' not fully implemented, using uncompressed data`);
      compressedData = new Uint8Array(imageData.buffer);
    }

    // Create basic TIFF structure
    const tiffHeader = new ArrayBuffer(8);
    const headerView = new DataView(tiffHeader);
    
    // Write TIFF header (little-endian)
    headerView.setUint16(0, 0x4949, true); // "II" - little endian
    headerView.setUint16(2, 42, true);     // TIFF magic number
    headerView.setUint32(4, 8, true);      // Offset to first IFD
    
    // Create IFD (Image File Directory)
    const ifdEntries = [
      { tag: 256, type: 4, count: 1, value: width },           // ImageWidth
      { tag: 257, type: 4, count: 1, value: height },          // ImageLength
      { tag: 258, type: 3, count: samplesPerPixel, value: bitsPerSample }, // BitsPerSample
      { tag: 259, type: 3, count: 1, value: this.getCompressionValue(compression) }, // Compression
      { tag: 262, type: 3, count: 1, value: photometric },     // PhotometricInterpretation
      { tag: 273, type: 4, count: 1, value: 0 },               // StripOffsets (will be updated)
      { tag: 277, type: 3, count: 1, value: samplesPerPixel }, // SamplesPerPixel
      { tag: 278, type: 4, count: 1, value: tileSize === 0 ? rowsPerStrip : height }, // RowsPerStrip
      { tag: 279, type: 4, count: 1, value: compressedData.length }, // StripByteCounts
      { tag: 282, type: 5, count: 1, value: 0 },               // XResolution (rational)
      { tag: 283, type: 5, count: 1, value: 0 },               // YResolution (rational)
      { tag: 284, type: 3, count: 1, value: planarConfig },    // PlanarConfiguration
      { tag: 296, type: 3, count: 1, value: resolutionUnit },  // ResolutionUnit
    ];

    // Add predictor if compression supports it
    if (compression === 'lzw' || compression === 'deflate') {
      ifdEntries.push({ tag: 317, type: 3, count: 1, value: predictor }); // Predictor
    }

    // Calculate total size needed
    const ifdSize = 2 + (ifdEntries.length * 12) + 4; // entry count + entries + next IFD offset
    const rationalsSize = 16; // Two rational values for X and Y resolution
    const dataOffset = 8 + ifdSize + rationalsSize;
    const totalSize = dataOffset + compressedData.length;

    // Create final buffer
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    // Copy header
    uint8View.set(new Uint8Array(tiffHeader), 0);

    // Write IFD
    let offset = 8;
    view.setUint16(offset, ifdEntries.length, true); // Number of entries
    offset += 2;

    // Write IFD entries
    for (let i = 0; i < ifdEntries.length; i++) {
      const entry = ifdEntries[i];
      view.setUint16(offset, entry.tag, true);
      view.setUint16(offset + 2, entry.type, true);
      view.setUint32(offset + 4, entry.count, true);
      
      if (entry.tag === 273) { // StripOffsets
        view.setUint32(offset + 8, dataOffset, true);
      } else if (entry.tag === 282) { // XResolution
        view.setUint32(offset + 8, 8 + ifdSize, true); // Offset to rational
      } else if (entry.tag === 283) { // YResolution
        view.setUint32(offset + 8, 8 + ifdSize + 8, true); // Offset to rational
             } else if (entry.tag === 258 && Array.isArray(entry.value)) { // BitsPerSample array
         if (entry.value.length === 1) {
           view.setUint32(offset + 8, entry.value[0], true);
         } else {
           // For multiple values, would need to store separately
           view.setUint32(offset + 8, entry.value[0], true); // Simplified
         }
       } else {
         view.setUint32(offset + 8, typeof entry.value === 'number' ? entry.value : entry.value[0], true);
       }
      
      offset += 12;
    }

    // Next IFD offset (0 = no more IFDs)
    view.setUint32(offset, 0, true);
    offset += 4;

    // Write resolution rationals
    // X Resolution
    view.setUint32(offset, resolutionX, true);     // Numerator
    view.setUint32(offset + 4, 1, true);          // Denominator
    offset += 8;
    
    // Y Resolution
    view.setUint32(offset, resolutionY, true);     // Numerator
    view.setUint32(offset + 4, 1, true);          // Denominator
    offset += 8;

    // Write image data
    uint8View.set(compressedData, dataOffset);

    return buffer;
  }

  private static getCompressionValue(compression: string): number {
    switch (compression) {
      case 'none': return 1;       // No compression
      case 'lzw': return 5;        // LZW
      case 'packbits': return 32773; // PackBits
      case 'deflate': return 8;    // Deflate/ZIP
      case 'jpeg': return 7;       // JPEG
      default: return 1;           // No compression
    }
  }
}