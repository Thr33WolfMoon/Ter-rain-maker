import { Color } from 'three';

export const TERRAIN_WIDTH = 100000;
export const TERRAIN_HEIGHT = 100000;
// Use a power of two for easier LOD division
export const TERRAIN_SEGMENTS_X = 128;
export const TERRAIN_SEGMENTS_Y = 128;
export const SEA_FLOOR_LEVEL = -10;

// Chunking and LOD constants
export const NUM_CHUNKS_X = 8;
export const NUM_CHUNKS_Y = 8;
export const CHUNK_SEGMENTS_X = TERRAIN_SEGMENTS_X / NUM_CHUNKS_X; // 16
export const CHUNK_SEGMENTS_Y = TERRAIN_SEGMENTS_Y / NUM_CHUNKS_Y; // 16
export const CHUNK_WIDTH = TERRAIN_WIDTH / NUM_CHUNKS_X;
export const CHUNK_HEIGHT = TERRAIN_HEIGHT / NUM_CHUNKS_Y;

// LOD levels: distance at which to switch, and segments for the chunk geometry
export const LOD_LEVELS = [
    { distance: 40000, segments: CHUNK_SEGMENTS_X },     // Full detail
    { distance: 90000, segments: CHUNK_SEGMENTS_X / 2 }, // 8x8
    { distance: 160000, segments: CHUNK_SEGMENTS_X / 4 }, // 4x4
];


// Elevation levels for automatic coloring
export const SNOW_LEVEL = 40;
export const ROCK_LEVEL = 25;
export const LAND_LEVEL = 0;

// Color definitions used for both procedural coloring and manual painting
export const snowColor = new Color(0xffffff);
export const rockColor = new Color(0x999999);
export const landColor = new Color(0xcccccc);
export const waterColor = new Color(0x5c95c9);
export const grassColor = new Color(0x6a994e);
export const sandColor = new Color(0xf2e2a0);
export const forestColor = new Color(0x386641);

export const PAINT_PALETTE = [
    { name: 'Grass', color: grassColor },
    { name: 'Sand', color: sandColor },
    { name: 'Forest', color: forestColor },
    { name: 'Rock', color: rockColor },
    { name: 'Snow', color: snowColor },
    { name: 'Water', color: waterColor },
];