import { pipeline, env } from '@huggingface/transformers';

// Configure transformers to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_DIMENSION = 1024;

// Passport photo size: 35mm x 45mm (Indian standard)
const PASSPORT_ASPECT_RATIO = 35 / 45;
const PASSPORT_OUTPUT_WIDTH = 413; // 35mm at 300 DPI
const PASSPORT_OUTPUT_HEIGHT = 531; // 45mm at 300 DPI

let faceDetector: any = null;

export async function initFaceDetector() {
  if (faceDetector) return faceDetector;
  
  try {
    faceDetector = await pipeline(
      'object-detection',
      'Xenova/detr-resnet-50',
      { device: 'webgpu' }
    );
    return faceDetector;
  } catch (error) {
    console.error('Failed to initialize face detector with WebGPU, trying WASM:', error);
    faceDetector = await pipeline(
      'object-detection',
      'Xenova/detr-resnet-50'
    );
    return faceDetector;
  }
}

export async function detectAndCropFace(imageUrl: string): Promise<{
  croppedImageUrl: string;
  coordinates: { x: number; y: number; width: number; height: number };
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        let width = img.width;
        let height = img.height;
        let scale = 1;
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            scale = MAX_DIMENSION / width;
            height = Math.round(height * scale);
            width = MAX_DIMENSION;
          } else {
            scale = MAX_DIMENSION / height;
            width = Math.round(width * scale);
            height = MAX_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        let cropX: number, cropY: number, cropWidth: number, cropHeight: number;
        
        // Try to detect face/person using the model
        try {
          const detector = await initFaceDetector();
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          const results = await detector(imageData);
          
          // Filter for person detections
          const personResults = results.filter((r: any) => 
            r.label?.toLowerCase().includes('person') && r.score > 0.5
          );
          
          if (personResults.length > 0) {
            const detection = personResults.reduce((prev: any, curr: any) => 
              curr.score > prev.score ? curr : prev
            );
            
            const box = detection.box;
            
            // For passport: face should be in upper portion
            // Expand the detection to include head + shoulders
            const detectionCenterX = box.xmin + box.width / 2;
            const detectionTop = box.ymin;
            
            // Calculate passport crop dimensions
            // Face should occupy about 70-80% of the height from chin to top of head
            // and be centered horizontally
            cropHeight = box.height * 1.8; // Expand to include shoulders
            cropWidth = cropHeight * PASSPORT_ASPECT_RATIO;
            
            // Center horizontally on detection
            cropX = detectionCenterX - cropWidth / 2;
            // Position so face is in upper 60% of frame
            cropY = detectionTop - cropHeight * 0.15;
            
            // Clamp to canvas bounds
            cropX = Math.max(0, Math.min(cropX, width - cropWidth));
            cropY = Math.max(0, Math.min(cropY, height - cropHeight));
            cropWidth = Math.min(cropWidth, width - cropX);
            cropHeight = Math.min(cropHeight, height - cropY);
          } else {
            throw new Error('No person detected');
          }
        } catch (modelError) {
          console.warn('Model detection failed, using center crop:', modelError);
          
          // Fallback: Center crop with passport aspect ratio
          // Assume face is in upper-center portion of image
          if (width / height > PASSPORT_ASPECT_RATIO) {
            // Image is wider - use full height
            cropHeight = height * 0.9;
            cropWidth = cropHeight * PASSPORT_ASPECT_RATIO;
          } else {
            // Image is taller - use full width
            cropWidth = width * 0.9;
            cropHeight = cropWidth / PASSPORT_ASPECT_RATIO;
          }
          
          cropX = (width - cropWidth) / 2;
          cropY = height * 0.05; // Start from top 5%
        }
        
        // Create passport-sized output canvas
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d')!;
        cropCanvas.width = PASSPORT_OUTPUT_WIDTH;
        cropCanvas.height = PASSPORT_OUTPUT_HEIGHT;
        
        // Fill with white background
        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, PASSPORT_OUTPUT_WIDTH, PASSPORT_OUTPUT_HEIGHT);
        
        // Draw cropped and scaled image
        cropCtx.drawImage(
          canvas,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, PASSPORT_OUTPUT_WIDTH, PASSPORT_OUTPUT_HEIGHT
        );
        
        resolve({
          croppedImageUrl: cropCanvas.toDataURL('image/png', 1.0),
          coordinates: {
            x: cropX / scale,
            y: cropY / scale,
            width: cropWidth / scale,
            height: cropHeight / scale
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
