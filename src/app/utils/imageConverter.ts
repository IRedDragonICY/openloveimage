import { heicTo, isHeic } from 'heic-to';
import { ConversionSettings } from '../components/ConversionOptions';

// Type declaration for imagetracerjs
declare const ImageTracer: {
  imagedataToSVG: (imageData: ImageData, options?: any) => string;
};

// Import imagetracerjs
const ImageTracerModule = require('imagetracerjs');

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  error?: string;
  originalSize: number;
  convertedSize?: number;
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
      let stylePreset: any = {};
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
    onProgress?: (progress: number) => void
  ): Promise<ConversionResult> {
    try {
      // Validate file input
      if (!file || !file.name || file.size === undefined) {
        throw new Error('Invalid file provided');
      }

      const originalSize = file.size;
      let convertedBlob: Blob;

      // Report initial progress
      onProgress?.(10);

      // Check if input is HEIC
      const isInputHeic = await isHeic(file);
      onProgress?.(20);

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
            convertedBlob = await this.convertRegularImage(file, settings);
            onProgress?.(80);
          }
        }
      }

      onProgress?.(90);

      const result = {
        success: true,
        blob: convertedBlob,
        originalSize,
        convertedSize: convertedBlob.size
      };

      onProgress?.(100);
      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        originalSize: file?.size || 0
      };
    }
  }

  static async convertMultipleImages(
    files: File[],
    settings: ConversionSettings,
    onOverallProgress?: (completed: number, total: number) => void,
    onIndividualProgress?: (fileIndex: number, progress: number) => void
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.convertImage(
        files[i], 
        settings,
        (progress) => onIndividualProgress?.(i, progress)
      );
      results.push(result);
      
      if (onOverallProgress) {
        onOverallProgress(i + 1, files.length);
      }
    }

    return results;
  }

  static getSupportedFormats(): { input: string[]; output: string[] } {
    return {
      input: ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'svg'],
      output: ['jpeg', 'png', 'webp', 'svg'] // HEIC output not supported in browsers
    };
  }

  static async getImageInfo(file: File): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    isHeic: boolean;
  }> {
    try {
      const isHeicFile = await isHeic(file);
      
      if (isHeicFile) {
        // For HEIC files, we need to convert first to get dimensions
        const tempBlob = await heicTo({
          blob: file,
          type: 'image/jpeg',
          quality: 0.1 // Low quality for just getting dimensions
        });
        
        const img = await this.loadImage(new File([tempBlob], 'temp.jpg', { type: 'image/jpeg' }));
        
        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: 'HEIC',
          size: file.size,
          isHeic: true
        };
      } else {
        // Check if it's an SVG file
        const isSvgFile = (file.type === 'image/svg+xml') || file.name.toLowerCase().endsWith('.svg');
        
        let img: HTMLImageElement;
        if (isSvgFile) {
          img = await this.loadSvgAsImage(file);
        } else {
          img = await this.loadImage(file);
        }
        
        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: isSvgFile ? 'SVG' : (file.type.split('/')[1]?.toUpperCase() || 'Unknown'),
          size: file.size,
          isHeic: false
        };
      }
    } catch {
        throw new Error('Failed to read image information');
      }
  }
} 