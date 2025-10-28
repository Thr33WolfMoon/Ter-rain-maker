
import { Vector3 } from 'three';
import { Tool, BrushSettings } from '../types';
import { TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y } from '../constants';

const VERTICES_X = TERRAIN_SEGMENTS_X + 1;
const VERTICES_Y = TERRAIN_SEGMENTS_Y + 1;
const BRUSH_INTENSITY_MULTIPLIER = 5.0;

const smoothStep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
};

const applyRaiseLower = (
    heightData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    isRaise: boolean
): Float32Array => {
    const newHeightData = new Float32Array(heightData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;

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
                
                const amount = (isRaise ? 1 : -1) * brush.strength * falloff * BRUSH_INTENSITY_MULTIPLIER;
                
                const index = y * VERTICES_X + x;
                newHeightData[index] += amount;
            }
        }
    }
    return newHeightData;
};

const applyFlatten = (
    heightData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
    targetHeight: number
): Float32Array => {
    const newHeightData = new Float32Array(heightData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;

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
                
                const index = y * VERTICES_X + x;
                const currentHeight = newHeightData[index];
                const newHeight = currentHeight + (targetHeight - currentHeight) * brush.strength * falloff;
                newHeightData[index] = newHeight;
            }
        }
    }
    return newHeightData;
};

const applySmooth = (
    heightData: Float32Array,
    intersectionPoint: Vector3,
    brush: BrushSettings,
): Float32Array => {
    const newHeightData = new Float32Array(heightData);
    const brushRadius = brush.size / 2;
    const brushRadiusSq = brushRadius * brushRadius;

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
                let neighborCount = 0;

                // Simple 3x3 kernel smoothing
                for (let j = -1; j <= 1; j++) {
                    for (let i = -1; i <= 1; i++) {
                        const neighborX = x + i;
                        const neighborY = y + j;

                        if (neighborX >= 0 && neighborX < VERTICES_X && neighborY >= 0 && neighborY < VERTICES_Y) {
                            const neighborIndex = neighborY * VERTICES_X + neighborX;
                            totalHeight += heightData[neighborIndex];
                            neighborCount++;
                        }
                    }
                }

                if (neighborCount > 0) {
                    const averageHeight = totalHeight / neighborCount;
                    const distance = Math.sqrt(distSq);
                    const falloff = 1 - smoothStep(0, brushRadius, distance);
                    const currentHeight = heightData[index];
                    newHeightData[index] = currentHeight + (averageHeight - currentHeight) * brush.strength * falloff;
                }
            }
        }
    }
    return newHeightData;
};


export const applyBrush = (
    heightData: Float32Array,
    intersectionPoint: Vector3,
    tool: Tool,
    brush: BrushSettings,
    targetHeight?: number
): Float32Array | null => {
    switch (tool) {
        case Tool.Raise:
            return applyRaiseLower(heightData, intersectionPoint, brush, true);
        case Tool.Lower:
            return applyRaiseLower(heightData, intersectionPoint, brush, false);
        case Tool.Flatten:
            if (targetHeight === undefined) return null;
            return applyFlatten(heightData, intersectionPoint, brush, targetHeight);
        case Tool.Smooth:
            return applySmooth(heightData, intersectionPoint, brush);
        default:
            return null;
    }
};
