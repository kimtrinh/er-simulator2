/**
 * Utility for extracting images from PDF documents using pdf.js
 */

declare const pdfjsLib: any;

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const extractImagesFromPDF = async (pdfData: ArrayBuffer): Promise<string[]> => {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const imageUrls: string[] = [];

  // Limit to 8 pages for performance
  const numPages = Math.min(pdf.numPages, 8);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    
    for (let j = 0; j < ops.fnArray.length; j++) {
      if (
        ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject || 
        ops.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        const imgName = ops.argsArray[j][0];
        try {
          const imgObj = await page.objs.get(imgName);
          
          if (imgObj && imgObj.data) {
            // Optimization: Downscale images larger than 1200px to save memory and time
            const MAX_DIM = 1200;
            let width = imgObj.width;
            let height = imgObj.height;

            if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            // Using temp canvas for pixel manipulation if we need to resize
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imgObj.width;
            tempCanvas.height = imgObj.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) continue;

            const imageData = tempCtx.createImageData(imgObj.width, imgObj.height);
            
            if (imgObj.data instanceof Uint8ClampedArray) {
                imageData.data.set(imgObj.data);
            } else {
                const data = imgObj.data;
                const rgba = new Uint8ClampedArray(imgObj.width * imgObj.height * 4);
                for (let k = 0, l = 0; k < data.length; k += 3, l += 4) {
                    rgba[l] = data[k];
                    rgba[l+1] = data[k+1];
                    rgba[l+2] = data[k+2];
                    rgba[l+3] = 255;
                }
                imageData.data.set(rgba);
            }
            
            tempCtx.putImageData(imageData, 0, 0);
            
            // Draw scaled image to main canvas
            ctx.drawImage(tempCanvas, 0, 0, width, height);
            
            // Quality 0.7 for faster generation/smaller size
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            if (imgObj.width > 80 && imgObj.height > 80) {
              imageUrls.push(dataUrl);
            }
          }
        } catch (err) {
          console.warn('Could not extract image:', imgName);
        }
      }
    }
  }

  return Array.from(new Set(imageUrls)).slice(0, 10);
};