
export enum Tool {
  Raise = 'Raise',
  Lower = 'Lower',
  Flatten = 'Flatten',
  Smooth = 'Smooth',
  Paint = 'Paint',
  Plane = 'Plane',
}

export interface BrushSettings {
  size: number;
}

export type PaintMode = 'color' | 'texture';

export interface TextureSettings {
    scale: number;
    rotation: number;
    blendWeight: number;
}

export interface TerrainFeature {
  type: 'mountain' | 'ridge' | 'lake' | 'valley';
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface ProceduralParams {
  baseParams: {
    octaves: number;
    persistence: number;
    lacunarity: number;
    baseFrequency: number;
    exponent: number;
    heightScale: number;
  };
  features: TerrainFeature[];
}
