
import { Vector3, Color } from 'three';
import { Tool, BrushSettings, PaintMode, TextureSettings } from '../types';
import { 
    TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y, SEA_FLOOR_LEVEL,
    SNOW_LEVEL, ROCK_LEVEL, LAND_LEVEL,
    snowColor, rockColor, landColor, sandColor
} from '../constants';

const VERTICES_X = TERRAIN_SEGMENTS_X + 1;
const VERTICES_Y = TERRAIN_SEGMENTS_Y + 1;
const BRUSH_INTENSITY_MULTIPLIER = 3000.0;
const DEFAULT_STRENGTH = 0.5;

let textureCanvas: HTMLCanvasElement | null = null;
let textureCtx: CanvasRenderingContext2D | null = null;

// A helper to get a canvas context for sampling texture pixels.
// It caches the canvas and only redraws when the image source changes.
const getTextureContext = (image: HTMLImageElement): CanvasRenderingContext2D | null => {
    if (!textureCanvas || textureCanvas.width !== image.width || textureCanvas.height !== image.height) {
        textureCanvas = document.createElement('canvas');
        textureCanvas.width = image.width;
        textureCanvas.height = image.height;
        textureCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
        if (textureCtx) {
            textureCtx.drawImage(image, 0, 0);
        }
    }
    // If the image is already on the canvas, we don't need to redraw.
    // This assumes the same image element instance is passed until a new one is loaded.
    else if (textureCtx && textureCtx.canvas.width === image.width && textureCtx.canvas.height === image.height) {
         // To be safe, we can add a check to see if the image is the same one
         // but for simplicity, we assume the App component manages the image object's identity.
    }

    return textureCtx;
};

const smoothStep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
};

export const calculateColorFromHeight = (height: number): Color => {
    const tempColor = new Color();
    if (height >= SNOW_LEVEL) {
        tempColor.copy(snowColor);
    } else if (height >= ROCK_LEVEL) {
        const t = (height - ROCK_LEVEL) / (SNOW_LEVEL - ROCK_LEVEL);
        tempColor.lerpColors(rockColor, snowColor, t);
    } else if (height >= LAND_LEVEL) {
        const t = (height - LAND_LEVEL) / (ROCK_LEVEL - LAND_LEVEL);
        tempColor.lerpColors(landColor, rockColor, t);
    } else {
        tempColor.copy(sandColor); // Use sand color for the seabed
    }
    return tempColor;
};

export const generateInitialColorData = (heightData: Float32Array): Float32Array => {
    const colorData = new Float32Array(heightData.length * 3);
    for (let i = 0; i < heightData.length; i++) {
        const color = calculateColorFromHeight(heightData[i]);
        color.toArray(colorData, i * 3);
    }
    return colorData;
};

const applyRaiseLower = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    isRaise: boolean
): { heightData: Float32Array, colorData: Float32Array } => {
    const newHeightData = new Float32Array(heightData);
    const newColorData = new Float32Array(colorData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;
    const currentColor = new Color();

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;

            const dx = vertexX - intersectionPoint.x;
            const dz = vertexZ - intersectionPoint.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < brushRadiusSq) {
                const distance = Math.sqrt(distSq);
                const falloff = 1 - smoothStep(0, brushRadius, distance);
                
                const amount = (isRaise ? 1 : -1) * DEFAULT_STRENGTH * falloff * BRUSH_INTENSITY_MULTIPLIER;
                
                const index = y * VERTICES_X + x;
                const currentHeight = newHeightData[index];
                let newHeight = currentHeight + amount;

                if (isRaise) {
                    newHeight = Math.min(newHeight, TERRAIN_WIDTH);
                } else {
                    newHeight = Math.max(SEA_FLOOR_LEVEL, newHeight);
                }
                newHeightData[index] = newHeight;

                const newColor = calculateColorFromHeight(newHeight);
                currentColor.fromArray(newColorData, index * 3);
                currentColor.lerp(newColor, DEFAULT_STRENGTH * falloff);
                currentColor.toArray(newColorData, index * 3);
            }
        }
    }
    return { heightData: newHeightData, colorData: newColorData };
};

const applyFlatten = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    targetHeight: number
): { heightData: Float32Array, colorData: Float32Array } => {
    const newHeightData = new Float32Array(heightData);
    const newColorData = new Float32Array(colorData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;
    const currentColor = new Color();

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;
            
            const dx = vertexX - intersectionPoint.x;
            const dz = vertexZ - intersectionPoint.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < brushRadiusSq) {
                const distance = Math.sqrt(distSq);
                const falloff = 1 - smoothStep(0, brushRadius, distance);
                const strength = DEFAULT_STRENGTH * falloff;
                
                const index = y * VERTICES_X + x;
                const currentHeight = newHeightData[index];
                const newHeight = currentHeight + (targetHeight - currentHeight) * strength;
                newHeightData[index] = newHeight;

                const newColor = calculateColorFromHeight(newHeight);
                currentColor.fromArray(newColorData, index * 3);
                currentColor.lerp(newColor, strength);
                currentColor.toArray(newColorData, index * 3);
            }
        }
    }
    return { heightData: newHeightData, colorData: newColorData };
};

const applySmooth = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings
): { heightData: Float32Array, colorData: Float32Array } => {
    const newHeightData = new Float32Array(heightData);
    const newColorData = new Float32Array(colorData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;
    
    const tempColor = new Color();

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;
            
            const dx = vertexX - intersectionPoint.x;
            const dz = vertexZ - intersectionPoint.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq < brushRadiusSq) {
                const index = y * VERTICES_X + x;
                
                let totalHeight = 0;
                let totalColor = new Color(0, 0, 0);
                let neighborCount = 0;

                for (let j = -1; j <= 1; j++) {
                    for (let i = -1; i <= 1; i++) {
                        const neighborX = x + i;
                        const neighborY = y + j;

                        if (neighborX >= 0 && neighborX < VERTICES_X && neighborY >= 0 && neighborY < VERTICES_Y) {
                            const neighborIndex = neighborY * VERTICES_X + neighborX;
                            totalHeight += heightData[neighborIndex];
                            tempColor.fromArray(colorData, neighborIndex * 3);
                            totalColor.add(tempColor);
                            neighborCount++;
                        }
                    }
                }

                if (neighborCount > 0) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1 - smoothStep(0, brushRadius, distance);
                    const strength = DEFAULT_STRENGTH * falloff;
                    
                    const averageHeight = totalHeight / neighborCount;
                    const currentHeight = heightData[index];
                    newHeightData[index] = currentHeight + (averageHeight - currentHeight) * strength;

                    const averageColor = totalColor.clone().multiplyScalar(1 / neighborCount);
                    const currentColor = new Color().fromArray(colorData, index * 3);
                    
                    currentColor.lerp(averageColor, strength);
                    currentColor.toArray(newColorData, index * 3);
                }
            }
        }
    }
    return { heightData: newHeightData, colorData: newColorData };
};

const applyPaint = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    paintColor: Color
): Float32Array => {
    const newColorData = new Float32Array(colorData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;
    const existingColor = new Color();

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;

            const dx = vertexX - intersectionPoint.x;
            const dz = vertexZ - intersectionPoint.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < brushRadiusSq) {
                const index = y * VERTICES_X + x;
                const currentHeight = heightData[index];
                
                // Only paint on land, not on water
                if (currentHeight >= LAND_LEVEL) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1 - smoothStep(0, brushRadius, distance);
                    const strength = DEFAULT_STRENGTH * falloff;
                    
                    existingColor.fromArray(newColorData, index * 3);
                    existingColor.lerp(paintColor, strength);
                    existingColor.toArray(newColorData, index * 3);
                }
            }
        }
    }
    return newColorData;
};

const applyTexturePaint = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    texture: HTMLImageElement,
    textureSettings: TextureSettings
): Float32Array => {
    const newColorData = new Float32Array(colorData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;
    const existingColor = new Color();
    const textureColor = new Color();

    const ctx = getTextureContext(texture);
    if (!ctx) return newColorData;

    // Helper for bilinear sampling. Safely wraps coordinates.
    const getPixel = (x_raw: number, y_raw: number): Uint8ClampedArray => {
        const x = (Math.floor(x_raw) % texture.width + texture.width) % texture.width;
        const y = (Math.floor(y_raw) % texture.height + texture.height) % texture.height;
        return ctx.getImageData(x, y, 1, 1).data;
    };

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;

            const dxInitial = vertexX - intersectionPoint.x;
            const dzInitial = vertexZ - intersectionPoint.z;
            const distSq = dxInitial * dxInitial + dzInitial * dzInitial;

            if (distSq < brushRadiusSq) {
                const index = y * VERTICES_X + x;
                const currentHeight = heightData[index];
                
                if (currentHeight >= LAND_LEVEL) {
                    // Apply rotation to the coordinate system of the brush
                    const rotationInRadians = (textureSettings.rotation || 0) * (Math.PI / 180);
                    const cosR = Math.cos(rotationInRadians);
                    const sinR = Math.sin(rotationInRadians);
                    const dx = dxInitial * cosR - dzInitial * sinR;
                    const dz = dxInitial * sinR + dzInitial * cosR;

                    // Normalize vertex position relative to the brush into UV space [0, 1]
                    const u = (dx / brushRadius) * 0.5 + 0.5;
                    const v = (dz / brushRadius) * 0.5 + 0.5;
                    
                    // Apply texture scale (tiling) within the brush projection
                    const u_scaled = u * textureSettings.scale;
                    const v_scaled = v * textureSettings.scale;

                    // --- Bilinear Interpolation Sampling ---
                    
                    // Calculate the exact, non-integer pixel coordinates.
                    // The -0.5 offset aligns sampling with pixel centers for accuracy.
                    // Flip V coordinate because canvas context origin (0,0) is top-left.
                    const u_pixel = u_scaled * texture.width - 0.5;
                    const v_pixel = (1.0 - v_scaled) * texture.height - 0.5;
                    
                    const texX0 = Math.floor(u_pixel);
                    const texY0 = Math.floor(v_pixel);
                    const fracX = u_pixel - texX0;
                    const fracY = v_pixel - texY0;

                    // Sample the 4 neighboring pixels
                    const p00 = getPixel(texX0, texY0);     // Top-left
                    const p10 = getPixel(texX0 + 1, texY0); // Top-right
                    const p01 = getPixel(texX0, texY0 + 1); // Bottom-left
                    const p11 = getPixel(texX0 + 1, texY0 + 1); // Bottom-right

                    // Interpolate in the x-direction for top and bottom rows
                    const topR = p00[0] * (1 - fracX) + p10[0] * fracX;
                    const topG = p00[1] * (1 - fracX) + p10[1] * fracX;
                    const topB = p00[2] * (1 - fracX) + p10[2] * fracX;

                    const bottomR = p01[0] * (1 - fracX) + p11[0] * fracX;
                    const bottomG = p01[1] * (1 - fracX) + p11[1] * fracX;
                    const bottomB = p01[2] * (1 - fracX) + p11[2] * fracX;

                    // Interpolate in the y-direction between the two new rows
                    const finalR = topR * (1 - fracY) + bottomR * fracY;
                    const finalG = topG * (1 - fracY) + bottomG * fracY;
                    const finalB = topB * (1 - fracY) + bottomB * fracY;

                    // Set color from sRGB pixel data and CONVERT TO LINEAR color space for correct blending.
                    textureColor.setRGB(finalR / 255, finalG / 255, finalB / 255).convertSRGBToLinear();

                    const distance = Math.sqrt(distSq);
                    const falloff = 1 - smoothStep(0, brushRadius, distance);
                    const strength = textureSettings.blendWeight * falloff;
                    
                    // Read existing linear color from the buffer
                    existingColor.fromArray(newColorData, index * 3);
                    // Blend the two linear colors
                    existingColor.lerp(textureColor, strength);
                    // Write the resulting linear color back to the buffer
                    existingColor.toArray(newColorData, index * 3);
                }
            }
        }
    }
    return newColorData;
};


const applyPlane = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    targetHeight: number
): { heightData: Float32Array, colorData: Float32Array } => {
    const newHeightData = new Float32Array(heightData);
    const newColorData = new Float32Array(colorData);
    
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;
    const coreRadius = brushRadius * 0.8;
    const currentColor = new Color();
    const FIXED_STRENGTH = 0.3; // A good default strength for a fast but smooth effect

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;
            
            const dx = vertexX - intersectionPoint.x;
            const dz = vertexZ - intersectionPoint.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < brushRadiusSq) {
                const index = y * VERTICES_X + x;
                const currentHeight = newHeightData[index];

                // Only allow raising terrain
                if (currentHeight >= targetHeight) {
                    continue;
                }

                const distance = Math.sqrt(distSq);
                
                let falloff = 1.0;
                if (distance > coreRadius) {
                   falloff = 1 - smoothStep(coreRadius, brushRadius, distance);
                }

                const strength = FIXED_STRENGTH * falloff;
                const newHeight = currentHeight + (targetHeight - currentHeight) * strength;
                
                newHeightData[index] = newHeight;

                const newColor = calculateColorFromHeight(newHeight);
                currentColor.fromArray(newColorData, index * 3);
                currentColor.lerp(newColor, strength);
                currentColor.toArray(newColorData, index * 3);
            }
        }
    }
    return { heightData: newHeightData, colorData: newColorData };
};

export const applyGlobalSmooth = (
    heightData: Float32Array,
    strength: number = 0.1
): { heightData: Float32Array, colorData: Float32Array } => {
    const readHeightData = new Float32Array(heightData);
    const newHeightData = new Float32Array(heightData);

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            let totalHeight = 0;
            let neighborCount = 0;

            for (let j = -1; j <= 1; j++) {
                for (let i = -1; i <= 1; i++) {
                    const neighborX = x + i;
                    const neighborY = y + j;

                    if (neighborX >= 0 && neighborX < VERTICES_X && neighborY >= 0 && neighborY < VERTICES_Y) {
                        const neighborIndex = neighborY * VERTICES_X + neighborX;
                        totalHeight += readHeightData[neighborIndex];
                        neighborCount++;
                    }
                }
            }
            
            if (neighborCount > 0) {
                const averageHeight = totalHeight / neighborCount;
                const index = y * VERTICES_X + x;
                const currentHeight = readHeightData[index];
                
                newHeightData[index] = currentHeight + (averageHeight - currentHeight) * strength;
            }
        }
    }
    
    const newColorData = generateInitialColorData(newHeightData);

    return { heightData: newHeightData, colorData: newColorData };
};

export const applyGlobalFlatten = (
    heightData: Float32Array,
    strength: number = 0.1
): { heightData: Float32Array, colorData: Float32Array } => {
    const newHeightData = new Float32Array(heightData);

    let totalLandHeight = 0;
    let landVertexCount = 0;

    // First, calculate the average height of only the land vertices (above or at water level).
    for (let i = 0; i < heightData.length; i++) {
        if (heightData[i] >= LAND_LEVEL) {
            totalLandHeight += heightData[i];
            landVertexCount++;
        }
    }

    // If there is no land, do nothing.
    if (landVertexCount === 0) {
        const newColorData = generateInitialColorData(heightData);
        return { heightData, colorData: newColorData };
    }

    const averageLandHeight = totalLandHeight / landVertexCount;

    // Second, apply the flatten effect ONLY to the land vertices.
    for (let i = 0; i < heightData.length; i++) {
        const currentHeight = heightData[i];
        if (currentHeight >= LAND_LEVEL) {
             newHeightData[i] = currentHeight + (averageLandHeight - currentHeight) * strength;
        }
    }

    const newColorData = generateInitialColorData(newHeightData);

    return { heightData: newHeightData, colorData: newColorData };
};


export const applyBrush = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    tool: Tool,
    brush: BrushSettings,
    options: { 
        targetHeight?: number;
        paintColor?: Color;
        paintMode?: PaintMode;
        paintTexture?: HTMLImageElement | null;
        textureSettings?: TextureSettings;
    }
): { heightData: Float32Array; colorData: Float32Array } | null => {
    switch (tool) {
        case Tool.Raise:
            return applyRaiseLower(heightData, colorData, intersectionPoint, brush, true);
        case Tool.Lower:
            return applyRaiseLower(heightData, colorData, intersectionPoint, brush, false);
        case Tool.Flatten:
            if (options.targetHeight === undefined) return null;
            return applyFlatten(heightData, colorData, intersectionPoint, brush, options.targetHeight);
        case Tool.Smooth:
            return applySmooth(heightData, colorData, intersectionPoint, brush);
        case Tool.Plane:
            if (options.targetHeight === undefined) return null;
            return applyPlane(heightData, colorData, intersectionPoint, brush, options.targetHeight);
        case Tool.Paint:
            if (options.paintMode === 'texture' && options.paintTexture && options.textureSettings) {
                const newColorData = applyTexturePaint(heightData, colorData, intersectionPoint, brush, options.paintTexture, options.textureSettings);
                return { heightData, colorData: newColorData };
            }
            if (options.paintMode === 'color' && options.paintColor) {
                const newColorData = applyPaint(heightData, colorData, intersectionPoint, brush, options.paintColor);
                return { heightData, colorData: newColorData };
            }
            return null;
        default:
            return null;
    }
};
