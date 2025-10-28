import { Vector3, Color } from 'three';
import { Tool, BrushSettings } from '../types';
import { 
    TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y, SEA_FLOOR_LEVEL,
    SNOW_LEVEL, ROCK_LEVEL, LAND_LEVEL,
    snowColor, rockColor, landColor, sandColor
} from '../constants';

const VERTICES_X = TERRAIN_SEGMENTS_X + 1;
const VERTICES_Y = TERRAIN_SEGMENTS_Y + 1;
const BRUSH_INTENSITY_MULTIPLIER = 3000.0;
const DEFAULT_STRENGTH = 0.5;

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

// FIX: Update return type to match what `applyBrush` expects.
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

                if (!isRaise) {
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
    // FIX: Update returned object properties to match the expected type.
    return { heightData: newHeightData, colorData: newColorData };
};

// FIX: Update return type to match what `applyBrush` expects.
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
    // FIX: Update returned object properties to match the expected type.
    return { heightData: newHeightData, colorData: newColorData };
};

// FIX: Update return type to match what `applyBrush` expects.
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

                    // FIX: The `Color` type in three.js does not have a `divideScalar` method. Use `multiplyScalar` with the reciprocal to achieve division.
                    const averageColor = totalColor.multiplyScalar(1/neighborCount);
                    const currentColor = tempColor.fromArray(colorData, index * 3);
                    currentColor.lerp(averageColor, strength);
                    currentColor.toArray(newColorData, index * 3);
                }
            }
        }
    }
    // FIX: Update returned object properties to match the expected type.
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


export const applyBrush = (
    heightData: Float32Array,
    colorData: Float32Array,
    intersectionPoint: Vector3,
    tool: Tool,
    brush: BrushSettings,
    options: { targetHeight?: number; paintColor?: Color }
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
            if (!options.paintColor) return null;
            const newColorData = applyPaint(heightData, colorData, intersectionPoint, brush, options.paintColor);
            return { heightData, colorData: newColorData };
        default:
            return null;
    }
};