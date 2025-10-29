import { Color } from 'three';

const PALETTE_SIZE = 12; // Extract up to 12 dominant colors

// Helper to quantize a color to reduce the color space for easier analysis.
const quantizeColor = (r: number, g: number, b: number): string => {
    // Reduce each channel to 16 levels (4 bits per channel)
    const r_q = Math.floor(r / 16) * 16;
    const g_q = Math.floor(g / 16) * 16;
    const b_q = Math.floor(b / 16) * 16;
    // Return a string key for use in a Map
    return `${r_q},${g_q},${b_q}`;
};

export const processPaletteImage = (file: File): Promise<{ name: string, color: Color }[] | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Scale down the image for faster processing to a max width of 100px
                const MAX_WIDTH = 100;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                const colorCounts: Map<string, { color: {r: number, g: number, b: number}, count: number }> = new Map();

                // Iterate over each pixel in the downscaled image
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i+1];
                    const b = imageData[i+2];
                    const a = imageData[i+3];

                    // Ignore transparent, pure white, or pure black pixels to avoid background colors
                    if (a < 128 || (r > 250 && g > 250 && b > 250) || (r < 5 && g < 5 && b < 5)) {
                        continue;
                    }

                    const key = quantizeColor(r, g, b);
                    if (colorCounts.has(key)) {
                        colorCounts.get(key)!.count++;
                    } else {
                        const [r_q, g_q, b_q] = key.split(',').map(Number);
                        colorCounts.set(key, { color: { r: r_q, g: g_q, b: b_q }, count: 1 });
                    }
                }
                
                // Sort the quantized colors by frequency to find the most dominant ones
                const sortedColors = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

                // Create the new palette array
                const newPalette = sortedColors
                    .slice(0, PALETTE_SIZE)
                    .map((item, index) => {
                        const threeColor = new Color(item.color.r / 255, item.color.g / 255, item.color.b / 255);
                        return {
                            name: `Color ${index + 1}`,
                            color: threeColor,
                        };
                    });

                resolve(newPalette);
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};