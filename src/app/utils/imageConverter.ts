import { heicTo, isHeic } from 'heic-to';
import { ConversionSettings } from '../components/ConversionOptions';

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

    // Convert to blob
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
        const img = await this.loadImage(new File([convertedBlob], 'temp'));
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
    const img = await this.loadImage(file);
    return await this.convertWithCanvas(img, settings);
  }

  static async convertImage(
    file: File,
    settings: ConversionSettings
  ): Promise<ConversionResult> {
    try {
      const originalSize = file.size;
      let convertedBlob: Blob;

      // Check if input is HEIC
      const isInputHeic = await isHeic(file);

      if (isInputHeic) {
        // Converting FROM HEIC
        if (settings.outputFormat === 'heic') {
          // HEIC to HEIC (just resize if needed)
          if (settings.maxWidth || settings.maxHeight) {
            convertedBlob = await this.convertFromHeic(file, { ...settings, outputFormat: 'jpeg' });
            // Then convert back - but browsers can't create HEIC, so this will fail
            throw new Error('HEIC to HEIC conversion with resizing is not supported');
          } else {
            // No conversion needed, just return original
            convertedBlob = file;
          }
        } else {
          // HEIC to other format
          convertedBlob = await this.convertFromHeic(file, settings);
        }
      } else {
        // Converting FROM regular image format
        if (settings.outputFormat === 'heic') {
          // Convert TO HEIC (not supported)
          throw new Error('Converting to HEIC format is not supported in browsers');
        } else {
          // Regular image to regular image
          convertedBlob = await this.convertRegularImage(file, settings);
        }
      }

      return {
        success: true,
        blob: convertedBlob,
        originalSize,
        convertedSize: convertedBlob.size
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        originalSize: file.size
      };
    }
  }

  static async convertMultipleImages(
    files: File[],
    settings: ConversionSettings,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.convertImage(files[i], settings);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }

    return results;
  }

  static getSupportedFormats(): { input: string[]; output: string[] } {
    return {
      input: ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'svg'],
      output: ['jpeg', 'png', 'webp'] // HEIC output not supported in browsers
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
        
        const img = await this.loadImage(new File([tempBlob], 'temp.jpg'));
        
        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: 'HEIC',
          size: file.size,
          isHeic: true
        };
      } else {
        const img = await this.loadImage(file);
        
        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: file.type.split('/')[1]?.toUpperCase() || 'Unknown',
          size: file.size,
          isHeic: false
        };
      }
          } catch {
        throw new Error('Failed to read image information');
      }
  }
} 