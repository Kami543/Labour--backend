export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination?: string;
    filename?: string;
    path?: string;
  }
  
  export interface ProcessedImage {
    url: string;
    path: string;
    metadata: {
      originalName: string;
      size: number;
      mimetype: string;
      width?: number;
      height?: number;
    };
  }
  
  export interface ImageUploadResult {
    success: boolean;
    url: string;
    path: string;
    thumbnailUrl?: string;
  }