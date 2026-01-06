import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'PDF417' | 'ITF14';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface BarcodeOptions {
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
}

export async function generateQRCodeDataUrl(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 200,
    margin = 2,
    color = { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel = 'M',
  } = options;

  try {
    const dataUrl = await QRCode.toDataURL(data, {
      width,
      margin,
      color,
      errorCorrectionLevel,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw error;
  }
}

export function generateBarcodeDataUrl(
  data: string,
  options: BarcodeOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const {
      format = 'CODE128',
      width = 2,
      height = 50,
      displayValue = true,
      fontSize = 14,
      margin = 10,
      background = '#ffffff',
      lineColor = '#000000',
    } = options;

    const canvas = document.createElement('canvas');
    
    try {
      JsBarcode(canvas, data, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        margin,
        background,
        lineColor,
      });
      
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Failed to generate barcode:', error);
      reject(error);
    }
  });
}

export async function generateQRCodeCanvas(
  data: string,
  options: QRCodeOptions = {}
): Promise<HTMLCanvasElement> {
  const {
    width = 200,
    margin = 2,
    color = { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel = 'M',
  } = options;

  const canvas = document.createElement('canvas');
  
  await QRCode.toCanvas(canvas, data, {
    width,
    margin,
    color,
    errorCorrectionLevel,
  });
  
  return canvas;
}

export function generateBarcodeCanvas(
  data: string,
  options: BarcodeOptions = {}
): HTMLCanvasElement {
  const {
    format = 'CODE128',
    width = 2,
    height = 50,
    displayValue = true,
    fontSize = 14,
    margin = 10,
    background = '#ffffff',
    lineColor = '#000000',
  } = options;

  const canvas = document.createElement('canvas');
  
  JsBarcode(canvas, data, {
    format,
    width,
    height,
    displayValue,
    fontSize,
    margin,
    background,
    lineColor,
  });
  
  return canvas;
}

// Validate barcode data for specific formats
export function validateBarcodeData(data: string, format: BarcodeFormat): boolean {
  switch (format) {
    case 'EAN13':
      return /^\d{12,13}$/.test(data);
    case 'EAN8':
      return /^\d{7,8}$/.test(data);
    case 'UPC':
      return /^\d{11,12}$/.test(data);
    case 'ITF14':
      return /^\d{13,14}$/.test(data);
    case 'CODE39':
      return /^[A-Z0-9\-. $/+%]+$/.test(data);
    case 'CODE128':
    case 'PDF417':
    default:
      return data.length > 0;
  }
}

// Get placeholder data for preview
export function getPlaceholderData(format: BarcodeFormat): string {
  switch (format) {
    case 'EAN13':
      return '123456789012';
    case 'EAN8':
      return '12345670';
    case 'UPC':
      return '12345678901';
    case 'ITF14':
      return '1234567890123';
    case 'CODE39':
      return 'CODE39';
    case 'PDF417':
      return 'PDF417DATA';
    case 'CODE128':
    default:
      return 'ID12345';
  }
}
