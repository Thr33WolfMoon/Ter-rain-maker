// Simplex noise implementation adapted from public domain sources.
class SimplexNoise {
    private p: number[] = [];
    private perm: number[] = [];
    private permMod12: number[] = [];

    constructor(seed: number = Math.random()) {
        const prng = this.createPrng(seed);
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        for (let i = 255; i > 0; i--) {
            const n = Math.floor(prng() * (i + 1));
            [this.p[i], this.p[n]] = [this.p[n], this.p[i]];
        }
        this.perm = this.p.concat(this.p);
        this.permMod12 = this.perm.map(v => v % 12);
    }
    
    private createPrng(seed: number) {
        let s = seed;
        return () => {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }

    private grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    private dot(g: number[], x: number, y: number): number {
        return g[0] * x + g[1] * y;
    }

    public noise(xin: number, yin: number): number {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        let n0, n1, n2;
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        return 70.0 * (n0 + n1 + n2);
    }
}


import { ProceduralParams, TerrainFeature } from '../types';
import { TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y, SEA_FLOOR_LEVEL } from '../constants';
import { generateInitialColorData } from './terrainUtils';

const VERTICES_X = TERRAIN_SEGMENTS_X + 1;
const VERTICES_Y = TERRAIN_SEGMENTS_Y + 1;

export const generateTerrainFromParams = (params: ProceduralParams): { heightData: Float32Array, colorData: Float32Array } => {
    const heightData = new Float32Array(VERTICES_X * VERTICES_Y).fill(0);
    const simplex = new SimplexNoise();

    const { octaves, persistence, lacunarity, baseFrequency, exponent, heightScale } = params.baseParams;
    
    // Calculate the maximum possible noise value for correct normalization.
    // The sum of amplitudes of all octaves gives us the theoretical max value.
    let maxPossibleAmplitude = 0;
    let amp = 1;
    for (let i = 0; i < octaves; i++) {
        maxPossibleAmplitude += amp;
        amp *= persistence;
    }

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            let amplitude = 1;
            let frequency = baseFrequency;
            let noiseHeight = 0;

            for (let i = 0; i < octaves; i++) {
                const sampleX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH * frequency;
                const sampleY = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT * frequency;
                const perlinValue = simplex.noise(sampleX, sampleY);
                noiseHeight += perlinValue * amplitude;

                amplitude *= persistence;
                frequency *= lacunarity;
            }
            
            // Normalize noise to 0-1 range using the calculated max amplitude
            const normalizedHeight = (noiseHeight / maxPossibleAmplitude + 1) / 2;
            const finalHeight = Math.pow(normalizedHeight, exponent) * heightScale;
            
            heightData[y * VERTICES_X + x] = finalHeight;
        }
    }
    
    // Apply features
    params.features.forEach(feature => {
        applyFeature(heightData, feature);
    });

    // Ensure terrain doesn't go below sea floor level
    for (let i = 0; i < heightData.length; i++) {
        heightData[i] = Math.max(SEA_FLOOR_LEVEL, heightData[i]);
    }
    
    const colorData = generateInitialColorData(heightData);
    
    return { heightData, colorData };
};

const applyFeature = (heightData: Float32Array, feature: TerrainFeature) => {
    const radiusSq = feature.radius * feature.radius;

    for (let y = 0; y < VERTICES_Y; y++) {
        for (let x = 0; x < VERTICES_X; x++) {
            const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
            const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;

            const dx = vertexX - feature.x;
            const dz = vertexZ - feature.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq);
                // Use smoothstep for a nice falloff curve
                const t = 1 - (dist / feature.radius);
                const strength = t * t * (3 - 2 * t);
                
                const index = y * VERTICES_X + x;
                const currentHeight = heightData[index];

                if (feature.type === 'mountain' || feature.type === 'ridge') {
                    const targetHeight = feature.height;
                    // Only raise the terrain towards the target height, preserving underlying detail.
                    // This is similar to the 'Plane' or 'Flatten' sculpting tools.
                    if (currentHeight < targetHeight) {
                        heightData[index] = currentHeight + (targetHeight - currentHeight) * strength;
                    }
                } else if (feature.type === 'lake' || feature.type === 'valley') {
                    const targetDepth = feature.height; // A negative value
                    // Only lower the terrain towards the target depth.
                    if (currentHeight > targetDepth) {
                        heightData[index] = currentHeight + (targetDepth - currentHeight) * strength;
                    }
                }
            }
        }
    }
};