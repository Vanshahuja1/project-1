import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  projectId: string;
  groupId?: string;
  templateData: any;
  records: any[];
  options: {
    includeBleed?: boolean;
    includeCropMarks?: boolean;
    includeColorBars?: boolean;
    format?: 'single' | 'separate' | 'bookmarked';
    pageSize?: 'A4' | 'A3' | 'Letter' | 'card';
    orientation?: 'portrait' | 'landscape';
    cardsPerRow?: number;
    cardsPerColumn?: number;
    cardSpacing?: number;
    pageMargin?: number;
    separateFrontBack?: boolean;
    side?: 'front' | 'back' | 'both';
    showSerialNumbers?: boolean;
    serialNumberPrefix?: string;
    startingSerialNumber?: number;
    showPageNumbers?: boolean;
  };
  batchIndex?: number;
  totalBatches?: number;
}

// Helper to resolve photo URLs - converts filenames to full Supabase Storage URLs
function resolvePhotoUrl(photoValue: string | null | undefined, projectId: string, supabaseUrl: string): string | null {
  if (!photoValue) return null;
  
  // Already a full URL or data URI
  if (photoValue.startsWith('http://') || photoValue.startsWith('https://') || photoValue.startsWith('data:')) {
    return photoValue;
  }
  
  // It's a filename - construct Supabase Storage public URL
  return `${supabaseUrl}/storage/v1/object/public/project-photos/${projectId}/${photoValue}`;
}

// Convert mm to PDF points (1 inch = 72 points, 1 inch = 25.4mm)
const MM_TO_POINTS = 72 / 25.4;

// Maximum records per batch to stay within CPU limits
const MAX_RECORDS_PER_BATCH = 25;

// Standard page sizes in mm
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
  card: null,
};

// Image cache to avoid re-fetching the same image
const imageCache = new Map<string, Uint8Array>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { projectId, groupId, templateData, records, options, batchIndex = 0, totalBatches = 1 } = await req.json() as GeneratePDFRequest;

    console.log(`Batch ${batchIndex + 1}/${totalBatches}: Processing ${records.length} records for project ${projectId}`);

    if (!records || records.length === 0) {
      throw new Error('No records provided for PDF generation');
    }

    if (!templateData) {
      throw new Error('No template data provided');
    }

    // Limit batch size
    if (records.length > MAX_RECORDS_PER_BATCH) {
      console.warn(`Batch size ${records.length} exceeds limit ${MAX_RECORDS_PER_BATCH}. Truncating.`);
    }
    const recordsToProcess = records.slice(0, MAX_RECORDS_PER_BATCH);

    const startTime = Date.now();
    const orientation = options.orientation || 'portrait';
    const separateFrontBack = options.separateFrontBack || false;
    const side = options.side || 'front';
    const showSerialNumbers = options.showSerialNumbers !== false; // Default true
    const serialNumberPrefix = options.serialNumberPrefix || '';
    const startingSerialNumber = options.startingSerialNumber || 1;
    const showPageNumbers = options.showPageNumbers !== false; // Default true

    // Get template/card dimensions
    const cardWidthMm = templateData.width_mm || 85.6;
    const cardHeightMm = templateData.height_mm || 54;
    const bleedMm = options.includeBleed ? 3 : 0;
    
    const cardWidthPt = (cardWidthMm + bleedMm * 2) * MM_TO_POINTS;
    const cardHeightPt = (cardHeightMm + bleedMm * 2) * MM_TO_POINTS;

    // Determine page size with orientation
    const pageSize = options.pageSize || 'A4';
    let pageWidthMm: number;
    let pageHeightMm: number;

    if (pageSize === 'card') {
      pageWidthMm = cardWidthMm + bleedMm * 2;
      pageHeightMm = cardHeightMm + bleedMm * 2;
    } else {
      const pageDimensions = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      if (orientation === 'landscape') {
        pageWidthMm = pageDimensions.height;
        pageHeightMm = pageDimensions.width;
      } else {
        pageWidthMm = pageDimensions.width;
        pageHeightMm = pageDimensions.height;
      }
    }

    const pageWidthPt = pageWidthMm * MM_TO_POINTS;
    const pageHeightPt = pageHeightMm * MM_TO_POINTS;

    // Grid layout settings
    const marginMm = options.pageMargin ?? 10;
    const spacingMm = options.cardSpacing ?? 5;
    const marginPt = marginMm * MM_TO_POINTS;
    const spacingPt = spacingMm * MM_TO_POINTS;
    
    // Space for serial number above cards
    const serialNumberHeightPt = showSerialNumbers ? 18 : 0;

    // Calculate cards per page if not in single card mode
    let cardsPerRow = options.cardsPerRow || 1;
    let cardsPerColumn = options.cardsPerColumn || 1;

    if (pageSize !== 'card') {
      if (!options.cardsPerRow) {
        cardsPerRow = Math.floor((pageWidthPt - marginPt * 2 + spacingPt) / (cardWidthPt + spacingPt));
      }
      if (!options.cardsPerColumn) {
        // Account for serial number height when calculating cards per column
        const effectiveCardHeight = cardHeightPt + serialNumberHeightPt;
        cardsPerColumn = Math.floor((pageHeightPt - marginPt * 2 + spacingPt) / (effectiveCardHeight + spacingPt));
      }
    }

    cardsPerRow = Math.max(1, cardsPerRow);
    cardsPerColumn = Math.max(1, cardsPerColumn);

    const cardsPerPage = cardsPerRow * cardsPerColumn;
    const totalPages = Math.ceil(recordsToProcess.length / cardsPerPage);

    console.log(`Page: ${pageWidthPt.toFixed(0)}x${pageHeightPt.toFixed(0)}pt, Grid: ${cardsPerRow}x${cardsPerColumn}, Pages: ${totalPages}`);

    // Determine which sides to generate
    const hasBackSide = templateData.has_back_side && templateData.back_design_json;
    const sidesToGenerate: ('front' | 'back')[] = [];
    
    if (separateFrontBack && hasBackSide) {
      if (side === 'both') {
        sidesToGenerate.push('front', 'back');
      } else {
        sidesToGenerate.push(side);
      }
    } else {
      sidesToGenerate.push('front');
    }

    const results: { side: string; url: string }[] = [];

    for (const currentSide of sidesToGenerate) {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const designJson = currentSide === 'back' && templateData.back_design_json 
        ? templateData.back_design_json 
        : templateData.design_json;

      // Pre-fetch and cache static images from template
      const staticImages = new Map<string, any>();
      if (designJson?.objects) {
        for (const obj of designJson.objects) {
          if (obj.type?.toLowerCase() === 'image' && obj.src && !obj.isVariableField) {
            try {
              const image = await fetchAndEmbedImage(pdfDoc, obj.src);
              if (image) staticImages.set(obj.src, image);
            } catch (e) {
              console.error('Failed to pre-cache static image:', obj.src);
            }
          }
        }
      }

      // Process records in batches per page
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

        // Set background color (white)
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidthPt,
          height: pageHeightPt,
          color: rgb(1, 1, 1),
        });

        // Calculate starting position for centering the grid
        // Account for serial number height in total grid height
        const effectiveCardHeight = cardHeightPt + serialNumberHeightPt;
        const totalGridWidth = cardsPerRow * cardWidthPt + (cardsPerRow - 1) * spacingPt;
        const totalGridHeight = cardsPerColumn * effectiveCardHeight + (cardsPerColumn - 1) * spacingPt;
        const startX = (pageWidthPt - totalGridWidth) / 2;
        const startY = pageHeightPt - (pageHeightPt - totalGridHeight) / 2;

        // Process cards for this page
        const startRecordIndex = pageIndex * cardsPerPage;
        const endRecordIndex = Math.min(startRecordIndex + cardsPerPage, recordsToProcess.length);

        for (let i = startRecordIndex; i < endRecordIndex; i++) {
          const record = recordsToProcess[i];
          const dataJson = record.data_json || record;
          
          const cardIndexOnPage = i - startRecordIndex;
          const col = cardIndexOnPage % cardsPerRow;
          const row = Math.floor(cardIndexOnPage / cardsPerRow);

          // Calculate global serial number for this record
          const globalRecordIndex = (batchIndex * MAX_RECORDS_PER_BATCH) + i;
          const serialNumber = startingSerialNumber + globalRecordIndex;

          // Calculate card position (account for serial number height)
          const cardX = startX + col * (cardWidthPt + spacingPt);
          const cardY = startY - (row + 1) * effectiveCardHeight - row * spacingPt + serialNumberHeightPt;
          
          // Draw serial number above the card
          if (showSerialNumbers) {
            const serialText = `${serialNumberPrefix}${serialNumber}`;
            const serialFontSize = 10;
            const textWidth = font.widthOfTextAtSize(serialText, serialFontSize);
            const serialX = cardX + (cardWidthPt - textWidth) / 2;
            const serialY = cardY + cardHeightPt + 4;
            
            // Draw serial number background box
            page.drawRectangle({
              x: serialX - 6,
              y: serialY - 3,
              width: textWidth + 12,
              height: serialFontSize + 6,
              color: rgb(1, 1, 1),
              borderColor: rgb(0.2, 0.2, 0.2),
              borderWidth: 0.5,
            });
            
            // Draw serial number text
            page.drawText(serialText, {
              x: serialX,
              y: serialY,
              size: serialFontSize,
              font: fontBold,
              color: rgb(0, 0, 0),
            });
          }

          // Draw card background
          page.drawRectangle({
            x: cardX,
            y: cardY,
            width: cardWidthPt,
            height: cardHeightPt,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.25,
          });

          // Draw crop marks if enabled
          if (options.includeCropMarks && bleedMm > 0) {
            drawCropMarks(page, cardX, cardY, cardWidthPt, cardHeightPt, bleedMm * MM_TO_POINTS);
          }

          // Get canvas dimensions from template
          // The template designer uses mmToPixels = 3.78 (96 DPI / 25.4)
          const mmToPixels = 3.78;
          const defaultCanvasWidth = (templateData.width_mm || 85.6) * mmToPixels;
          const defaultCanvasHeight = (templateData.height_mm || 54) * mmToPixels;
          const canvasWidth = designJson?.width || templateData.canvas_width || defaultCanvasWidth;
          const canvasHeight = designJson?.height || templateData.canvas_height || defaultCanvasHeight;

          // Render template objects
          if (designJson?.objects) {
            for (const obj of designJson.objects) {
              await renderObjectToPDF(
                page, 
                pdfDoc,
                obj, 
                dataJson, 
                record, 
                font, 
                fontBold, 
                bleedMm * MM_TO_POINTS, 
                cardHeightPt,
                cardWidthPt,
                cardX,
                cardY,
                canvasWidth,
                canvasHeight,
                staticImages,
                projectId,
                Deno.env.get('SUPABASE_URL') ?? ''
              );
            }
          }
        }

        // Add color bars if enabled
        if (options.includeColorBars) {
          drawColorBars(page);
        }

        // Add page number on the right side (rotated vertically like the reference)
        if (showPageNumbers) {
          const sideLabel = separateFrontBack ? ` (${currentSide.toUpperCase()})` : '';
          const batchLabel = totalBatches > 1 ? ` [Batch ${batchIndex + 1}]` : '';
          const pageText = `Page ${String(pageIndex + 1).padStart(2, '0')}${sideLabel}${batchLabel}`;
          
          // Draw page number at bottom right
          page.drawText(pageText, {
            x: pageWidthPt - 80,
            y: 15,
            size: 8,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          
          // Also draw rotated page number on right edge (like the reference PDF)
          const rotatedPageNum = `Page ${String(pageIndex + 1).padStart(2, '0')}`;
          page.drawText(rotatedPageNum, {
            x: pageWidthPt - 12,
            y: pageHeightPt / 2,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
            rotate: { angle: -90 * Math.PI / 180, type: 'radians' as any },
          });
        }
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();

      // Upload to storage
      const sidePrefix = separateFrontBack ? `-${currentSide}` : '';
      const batchSuffix = totalBatches > 1 ? `-batch${batchIndex}` : '';
      const fileName = `project-${projectId}/output${sidePrefix}${batchSuffix}-${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('generated-pdfs')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from('generated-pdfs')
        .getPublicUrl(fileName);

      console.log(`PDF (${currentSide}) uploaded: ${publicUrl}`);
      results.push({ side: currentSide, url: publicUrl });
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Batch ${batchIndex + 1}: Generated ${recordsToProcess.length} cards in ${duration.toFixed(1)}s`);

    return new Response(
      JSON.stringify({
        success: true,
        url: results[0]?.url,
        urls: results,
        recordsProcessed: recordsToProcess.length,
        pagesGenerated: totalPages,
        cardsPerPage,
        cardsPerRow,
        cardsPerColumn,
        duration,
        cardsPerSecond: Math.round(recordsToProcess.length / duration),
        batchIndex,
        totalBatches,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function drawCropMarks(page: any, cardX: number, cardY: number, cardWidthPt: number, cardHeightPt: number, bleedPt: number) {
  const markLength = 8;
  const innerX = cardX + bleedPt;
  const innerY = cardY + bleedPt;
  const innerWidth = cardWidthPt - bleedPt * 2;
  const innerHeight = cardHeightPt - bleedPt * 2;
  
  // Top-left
  page.drawLine({ start: { x: innerX, y: innerY + innerHeight + markLength }, end: { x: innerX, y: innerY + innerHeight }, thickness: 0.3, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: innerX - markLength, y: innerY + innerHeight }, end: { x: innerX, y: innerY + innerHeight }, thickness: 0.3, color: rgb(0, 0, 0) });
  
  // Top-right
  page.drawLine({ start: { x: innerX + innerWidth, y: innerY + innerHeight + markLength }, end: { x: innerX + innerWidth, y: innerY + innerHeight }, thickness: 0.3, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: innerX + innerWidth, y: innerY + innerHeight }, end: { x: innerX + innerWidth + markLength, y: innerY + innerHeight }, thickness: 0.3, color: rgb(0, 0, 0) });
  
  // Bottom-left
  page.drawLine({ start: { x: innerX, y: innerY - markLength }, end: { x: innerX, y: innerY }, thickness: 0.3, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: innerX - markLength, y: innerY }, end: { x: innerX, y: innerY }, thickness: 0.3, color: rgb(0, 0, 0) });
  
  // Bottom-right
  page.drawLine({ start: { x: innerX + innerWidth, y: innerY - markLength }, end: { x: innerX + innerWidth, y: innerY }, thickness: 0.3, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: innerX + innerWidth, y: innerY }, end: { x: innerX + innerWidth + markLength, y: innerY }, thickness: 0.3, color: rgb(0, 0, 0) });
}

function drawColorBars(page: any) {
  const barWidth = 8;
  const barHeight = 4;
  const startBarX = 10;
  const colors = [
    rgb(0, 1, 1),    // Cyan
    rgb(1, 0, 1),    // Magenta
    rgb(1, 1, 0),    // Yellow
    rgb(0, 0, 0),    // Black
  ];
  
  colors.forEach((color, idx) => {
    page.drawRectangle({
      x: startBarX + idx * (barWidth + 2),
      y: 10,
      width: barWidth,
      height: barHeight,
      color,
    });
  });
}

async function fetchAndEmbedImage(pdfDoc: any, url: string): Promise<any | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    
    const imageBytes = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (url.toLowerCase().includes('.png') || contentType.includes('png')) {
        return await pdfDoc.embedPng(imageBytes);
      } else {
        return await pdfDoc.embedJpg(imageBytes);
      }
    } catch {
      try { return await pdfDoc.embedJpg(imageBytes); } 
      catch { return await pdfDoc.embedPng(imageBytes); }
    }
  } catch (e) {
    console.error('Image fetch failed:', url, e);
    return null;
  }
}

async function renderObjectToPDF(
  page: any,
  pdfDoc: any,
  obj: any,
  dataJson: any,
  record: any,
  font: any,
  fontBold: any,
  bleedOffset: number,
  cardHeightPt: number,
  cardWidthPt: number,
  cardOffsetX: number,
  cardOffsetY: number,
  canvasWidth: number,
  canvasHeight: number,
  staticImages: Map<string, any>,
  projectId: string,
  supabaseUrl: string
) {
  // Scale factor: card content area (excluding bleed) vs canvas dimensions
  const cardContentWidth = cardWidthPt - bleedOffset * 2;
  const cardContentHeight = cardHeightPt - bleedOffset * 2;
  const scaleFactorX = cardContentWidth / canvasWidth;
  const scaleFactorY = cardContentHeight / canvasHeight;

  try {
    const objType = (obj.type || '').toLowerCase();
    
    if (objType === 'textbox' || objType === 'i-text' || objType === 'text') {
      let text = obj.text || '';
      
      // Replace variable fields
      const variablePattern = /\{\{(.+?)\}\}/g;
      text = text.replace(variablePattern, (_match: string, fieldName: string) => {
        const value = findFieldValue(dataJson, record, fieldName.trim());
        return value || '';
      });

      if (!text.trim()) return;

      const objScaleX = obj.scaleX || 1;
      const objScaleY = obj.scaleY || 1;
      const baseFontSize = obj.fontSize || 12;
      const fontSize = baseFontSize * objScaleY * scaleFactorY;
      
      // Calculate position within the content area
      const x = cardOffsetX + bleedOffset + (obj.left || 0) * scaleFactorX;
      const y = cardOffsetY + bleedOffset + cardContentHeight - (obj.top || 0) * scaleFactorY - fontSize;

      const color = parseColor(obj.fill || '#000000');
      const useFont = obj.fontWeight === 'bold' ? fontBold : font;

      // Calculate max width for text wrapping
      const maxWidth = obj.width ? obj.width * objScaleX * scaleFactorX : undefined;

      const lines = text.split('\n');
      let lineY = y;
      const lineHeight = fontSize * (obj.lineHeight || 1.2);

      for (const line of lines) {
        if (line.trim()) {
          page.drawText(line, {
            x,
            y: lineY,
            size: Math.max(4, fontSize),
            font: useFont,
            color,
            maxWidth,
          });
        }
        lineY -= lineHeight;
      }
    } else if (objType === 'rect') {
      const objScaleX = obj.scaleX || 1;
      const objScaleY = obj.scaleY || 1;
      const width = (obj.width || 100) * objScaleX * scaleFactorX;
      const height = (obj.height || 100) * objScaleY * scaleFactorY;
      const x = cardOffsetX + bleedOffset + (obj.left || 0) * scaleFactorX;
      const y = cardOffsetY + bleedOffset + cardContentHeight - (obj.top || 0) * scaleFactorY - height;

      // Check for photo placeholder - supports both old (isVariableField) and new (data.isPhoto) formats
      const isPhotoPlaceholder = 
        (obj.isVariableField && obj.variableType === 'photo') || 
        obj.data?.isPhoto === true;
      
      if (isPhotoPlaceholder) {
        const rawPhotoUrl = record.cropped_photo_url || record.photo_url || 
                         dataJson.photo_url || dataJson.photo || dataJson.profilePic;
        const photoUrl = resolvePhotoUrl(rawPhotoUrl, projectId, supabaseUrl);
        
        if (photoUrl) {
          const image = await fetchAndEmbedImage(pdfDoc, photoUrl);
          if (image) {
            page.drawImage(image, { x, y, width, height });
          } else {
            page.drawRectangle({ x, y, width, height, color: rgb(0.9, 0.9, 0.9) });
          }
        } else {
          page.drawRectangle({ x, y, width, height, color: rgb(0.9, 0.9, 0.9), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
        }
      } else {
        if (obj.fill && obj.fill !== 'transparent') {
          page.drawRectangle({ x, y, width, height, color: parseColor(obj.fill) });
        }
        if (obj.stroke) {
          page.drawRectangle({ x, y, width, height, borderColor: parseColor(obj.stroke), borderWidth: (obj.strokeWidth || 1) * scaleFactorX });
        }
      }
    } else if (objType === 'circle') {
      const objScaleX = obj.scaleX || 1;
      const radius = (obj.radius || 50) * objScaleX * scaleFactorX;
      const x = cardOffsetX + bleedOffset + ((obj.left || 0) + (obj.radius || 50) * objScaleX) * scaleFactorX;
      const y = cardOffsetY + bleedOffset + cardContentHeight - ((obj.top || 0) + (obj.radius || 50) * objScaleX) * scaleFactorY;

      // Check for circular photo placeholder
      const isPhotoPlaceholder = obj.data?.isPhoto === true;
      
      if (isPhotoPlaceholder) {
        const rawPhotoUrl = record.cropped_photo_url || record.photo_url || 
                         dataJson.photo_url || dataJson.photo || dataJson.profilePic;
        const photoUrl = resolvePhotoUrl(rawPhotoUrl, projectId, supabaseUrl);
        
        if (photoUrl) {
          const image = await fetchAndEmbedImage(pdfDoc, photoUrl);
          if (image) {
            // Draw circular clipped image
            const imgX = cardOffsetX + bleedOffset + (obj.left || 0) * scaleFactorX;
            const imgY = cardOffsetY + bleedOffset + cardContentHeight - (obj.top || 0) * scaleFactorY - radius * 2;
            page.drawImage(image, { x: imgX, y: imgY, width: radius * 2, height: radius * 2 });
          } else {
            page.drawCircle({ x, y, size: radius, color: rgb(0.9, 0.9, 0.9) });
          }
        } else {
          page.drawCircle({ x, y, size: radius, color: rgb(0.9, 0.9, 0.9) });
        }
      } else if (obj.fill && obj.fill !== 'transparent') {
        page.drawCircle({ x, y, size: radius, color: parseColor(obj.fill) });
      }
    } else if (objType === 'line') {
      const x1 = cardOffsetX + bleedOffset + ((obj.x1 || 0) + (obj.left || 0)) * scaleFactorX;
      const y1 = cardOffsetY + bleedOffset + cardContentHeight - ((obj.y1 || 0) + (obj.top || 0)) * scaleFactorY;
      const x2 = cardOffsetX + bleedOffset + ((obj.x2 || 100) + (obj.left || 0)) * scaleFactorX;
      const y2 = cardOffsetY + bleedOffset + cardContentHeight - ((obj.y2 || 0) + (obj.top || 0)) * scaleFactorY;
      
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: (obj.strokeWidth || 1) * scaleFactorX,
        color: parseColor(obj.stroke || '#000000'),
      });
    } else if (objType === 'polygon') {
      // Handle polygon photo placeholders (hexagon, star, pentagon, etc.)
      const isPhotoPlaceholder = obj.data?.isPhoto === true;
      
      if (isPhotoPlaceholder) {
        const rawPhotoUrl = record.cropped_photo_url || record.photo_url || 
                         dataJson.photo_url || dataJson.photo || dataJson.profilePic;
        const photoUrl = resolvePhotoUrl(rawPhotoUrl, projectId, supabaseUrl);
        
        const objScaleX = obj.scaleX || 1;
        const objScaleY = obj.scaleY || 1;
        const width = (obj.width || 100) * objScaleX * scaleFactorX;
        const height = (obj.height || 100) * objScaleY * scaleFactorY;
        const x = cardOffsetX + bleedOffset + (obj.left || 0) * scaleFactorX;
        const y = cardOffsetY + bleedOffset + cardContentHeight - (obj.top || 0) * scaleFactorY - height;
        
        if (photoUrl) {
          const image = await fetchAndEmbedImage(pdfDoc, photoUrl);
          if (image) {
            page.drawImage(image, { x, y, width, height });
          } else {
            page.drawRectangle({ x, y, width, height, color: rgb(0.9, 0.9, 0.9) });
          }
        } else {
          page.drawRectangle({ x, y, width, height, color: rgb(0.9, 0.9, 0.9), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
        }
      } else if (obj.fill && obj.fill !== 'transparent') {
        // Regular polygon (simplified as rectangle for now)
        const objScaleX = obj.scaleX || 1;
        const objScaleY = obj.scaleY || 1;
        const width = (obj.width || 100) * objScaleX * scaleFactorX;
        const height = (obj.height || 100) * objScaleY * scaleFactorY;
        const x = cardOffsetX + bleedOffset + (obj.left || 0) * scaleFactorX;
        const y = cardOffsetY + cardHeightPt - bleedOffset - (obj.top || 0) * scaleFactorY - height;
        page.drawRectangle({ x, y, width, height, color: parseColor(obj.fill) });
      }
    } else if (objType === 'image') {
      let imageUrl = obj.src;
      
      if (obj.isVariableField || obj.variableField === 'photo' || obj.data?.isPhoto === true) {
        const rawUrl = record.cropped_photo_url || record.photo_url || dataJson.photo_url || dataJson.photo || dataJson.profilePic;
        imageUrl = resolvePhotoUrl(rawUrl, projectId, supabaseUrl) || imageUrl;
      }
      
      if (imageUrl) {
        // Use cached image if available
        let image = staticImages.get(imageUrl);
        if (!image) {
          image = await fetchAndEmbedImage(pdfDoc, imageUrl);
        }
        
        if (image) {
          const objScaleX = obj.scaleX || 1;
          const objScaleY = obj.scaleY || 1;
          const width = (obj.width || image.width) * objScaleX * scaleFactorX;
          const height = (obj.height || image.height) * objScaleY * scaleFactorY;
          const x = cardOffsetX + bleedOffset + (obj.left || 0) * scaleFactorX;
          const y = cardOffsetY + cardHeightPt - bleedOffset - (obj.top || 0) * scaleFactorY - height;
          
          page.drawImage(image, { x, y, width, height });
        }
      }
    }
  } catch (error) {
    console.error('Error rendering object:', obj.type, error);
  }
}

function findFieldValue(dataJson: any, record: any, fieldName: string): string {
  const normalizedField = fieldName.toLowerCase().replace(/\s+/g, '');
  
  const fieldMappings: Record<string, string[]> = {
    'name': ['name', 'firstName', 'first_name', 'fullname', 'full_name', 'studentname', 'student_name'],
    'class': ['class', 'className', 'class_name', 'grade', 'standard'],
    'section': ['section', 'sec', 'division'],
    'rollno': ['rollNo', 'roll_no', 'rollNumber', 'roll_number', 'admno', 'adm_no', 'admNo', 'admissionNo'],
    'fathername': ['fatherName', 'father_name', 'fathersname', 'fathers_name', 'guardianname'],
    'mothername': ['motherName', 'mother_name', 'mothersname', 'mothers_name'],
    'phone': ['phone', 'mobile', 'mobileNo', 'mobile_no', 'contactNo', 'fatherMobNo', 'contact'],
    'email': ['email', 'emailId', 'email_id', 'emailaddress'],
    'address': ['address', 'fullAddress', 'full_address', 'homeAddress'],
    'dob': ['dob', 'dateofbirth', 'date_of_birth', 'birthdate', 'birth_date'],
    'bloodgroup': ['bloodGroup', 'blood_group', 'bloodtype', 'blood_type'],
    'photo': ['photo', 'photo_url', 'photoUrl', 'profilePic', 'profile_pic', 'image', 'picture'],
  };

  const mappedFields = fieldMappings[normalizedField];
  if (mappedFields) {
    for (const mappedField of mappedFields) {
      if (dataJson[mappedField] !== undefined && dataJson[mappedField] !== null && dataJson[mappedField] !== '') {
        return String(dataJson[mappedField]);
      }
      if (record[mappedField] !== undefined && record[mappedField] !== null && record[mappedField] !== '') {
        return String(record[mappedField]);
      }
    }
  }

  if (dataJson[fieldName] !== undefined && dataJson[fieldName] !== null && dataJson[fieldName] !== '') {
    return String(dataJson[fieldName]);
  }
  if (record[fieldName] !== undefined && record[fieldName] !== null && record[fieldName] !== '') {
    return String(record[fieldName]);
  }

  const dataKeys = Object.keys(dataJson);
  for (const key of dataKeys) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (normalizedKey === normalizedField || normalizedKey.includes(normalizedField) || normalizedField.includes(normalizedKey)) {
      if (dataJson[key] !== undefined && dataJson[key] !== null && dataJson[key] !== '') {
        return String(dataJson[key]);
      }
    }
  }

  const recordKeys = Object.keys(record);
  for (const key of recordKeys) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (normalizedKey === normalizedField || normalizedKey.includes(normalizedField) || normalizedField.includes(normalizedKey)) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
        return String(record[key]);
      }
    }
  }

  return '';
}

function parseColor(colorStr: string): { type: string; red: number; green: number; blue: number } {
  if (!colorStr) return rgb(0, 0, 0);
  
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return rgb(
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255
    );
  }
  
  const colors: Record<string, [number, number, number]> = {
    black: [0, 0, 0],
    white: [1, 1, 1],
    red: [1, 0, 0],
    green: [0, 1, 0],
    blue: [0, 0, 1],
    yellow: [1, 1, 0],
    cyan: [0, 1, 1],
    magenta: [1, 0, 1],
  };
  
  const colorName = colorStr.toLowerCase();
  if (colors[colorName]) {
    return rgb(...colors[colorName]);
  }
  
  return rgb(0, 0, 0);
}
