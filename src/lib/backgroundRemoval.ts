import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_DIMENSION = 1024;

let segmenter: any = null;

export async function initBackgroundRemover() {
  if (segmenter) return segmenter;

  try {
    segmenter = await pipeline(
      'image-segmentation',
      'Xenova/modnet',
      { device: 'webgpu' }
    );
    return segmenter;
  } catch (error) {
    console.error('Failed to initialize with WebGPU, trying WASM:', error);
    segmenter = await pipeline(
      'image-segmentation',
      'Xenova/modnet'
    );
    return segmenter;
  }
}

export async function removeBackground(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let width = img.width;
        let height = img.height;

        // Resize if needed
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = canvas.toDataURL('image/jpeg', 0.9);

        try {
          const model = await initBackgroundRemover();
          const result = await model(imageData);

          if (!result || !Array.isArray(result) || result.length === 0) {
            throw new Error('Background removal model returned no results');
          }

          // Create output canvas with WHITE background
          const outputCanvas = document.createElement('canvas');
          outputCanvas.width = width;
          outputCanvas.height = height;
          const outputCtx = outputCanvas.getContext('2d')!;

          // Fill with WHITE background first
          outputCtx.fillStyle = '#FFFFFF';
          outputCtx.fillRect(0, 0, width, height);

          // Get original image data
          const originalImageData = ctx.getImageData(0, 0, width, height);
          const originalData = originalImageData.data;

          // Create temporary canvas for masked subject
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(canvas, 0, 0);
          const tempImageData = tempCtx.getImageData(0, 0, width, height);
          const tempData = tempImageData.data;

          // Apply mask - blend subject with white background
          if (result[0].mask && result[0].mask.data) {
            // Fix 1: Normalize the mask correctly (clamp 0-1)
            const maskData = result[0].mask.data;

            for (let i = 0; i < maskData.length; i++) {
              const maskValue = maskData[i];
              const alpha = Math.min(Math.max(maskValue, 0), 1);
              const idx = i * 4;

              // Fix 2: Correct pixel blending logic
              const r = originalData[idx];
              const g = originalData[idx + 1];
              const b = originalData[idx + 2];

              // Blend: subject * alpha + white * (1 - alpha)
              tempData[idx] = Math.round(r * alpha + 255 * (1 - alpha));
              tempData[idx + 1] = Math.round(g * alpha + 255 * (1 - alpha));
              tempData[idx + 2] = Math.round(b * alpha + 255 * (1 - alpha));
              tempData[idx + 3] = 255; // Fully opaque
            }
            tempCtx.putImageData(tempImageData, 0, 0);
            outputCtx.drawImage(tempCanvas, 0, 0);
          } else {
            throw new Error('No mask data in result');
          }

          resolve(outputCanvas.toDataURL('image/png'));
        } catch (modelError) {
          console.warn('Model-based removal failed, using fallback:', modelError);
          // Fallback: return original with white background attempt
          resolve(canvas.toDataURL('image/png'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
