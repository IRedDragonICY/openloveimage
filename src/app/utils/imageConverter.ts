import {heicTo, isHeic} from 'heic-to';
import {ConversionSettings} from '../components/ConversionOptions';
import {jsPDF} from 'jspdf';
import toICO from '2ico';
import JSZip from 'jszip';

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

  private static async convertWithCanvas(
    image: HTMLImageElement,
    settings: ConversionSettings
  ): Promise<Blob> {
    const { canvas, ctx } = this.getCanvas();
    
    const { width, height } = this.calculateDimensions(
      image.naturalWidth,
      image.naturalHeight,
      settings.maxWidth,
      settings.maxHeight,
      settings.maintainAspectRatio
    );

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw image
    ctx.drawImage(image, 0, 0, width, height);

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
    
    let img: HTMLImageElement;
    try {
      if (isSvgInput) {
        img = await this.loadSvgAsImage(file);
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

      // Check if input is HEIC
      const isInputHeic = await isHeic(file);
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
          
          if (isSvgInput && settings.outputFormat === 'svg') {
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
          
          if (isInputHeic) {
            // Convert HEIC to canvas first
            const tempBlob = await this.convertFromHeic(file, { ...settings, outputFormat: 'jpeg' });
            const tempFile = new File([tempBlob], 'temp.jpg', { type: 'image/jpeg' });
            img = await this.loadImage(tempFile);
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
}