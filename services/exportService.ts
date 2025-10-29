import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y, LAND_LEVEL } from '../constants';

// Helper to trigger file download
const saveDataToFile = (data: BlobPart, filename: string) => {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


// Helper for linear interpolation of vertices to find intersection with the water plane
const interpolateVertex = (p1: THREE.Vector3, p2: THREE.Vector3, h1: number, h2: number): THREE.Vector3 => {
    // Avoid division by zero
    if (Math.abs(h1 - h2) < 1e-6) {
        return p1.clone();
    }
    const t = (LAND_LEVEL - h1) / (h2 - h1);
    return new THREE.Vector3().lerpVectors(p1, p2, t);
};

// Creates a mesh from scratch using a Marching Squares algorithm to generate a smooth coastline.
const createTerrainMeshForExport = (heightData: Float32Array, colorData: Float32Array): THREE.Mesh | null => {
    const totalVerticesX = TERRAIN_SEGMENTS_X + 1;

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    // Use a map with a string key to cache vertices and avoid duplicates
    const vertexMap = new Map<string, number>();
    let newIndexCounter = 0;

    const getVertexPosition = (x: number, y: number): THREE.Vector3 => {
        const vertexX = (x / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
        const vertexZ = (y / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;
        const height = heightData[y * totalVerticesX + x];
        return new THREE.Vector3(vertexX, height, vertexZ);
    };
    
    const getVertexColor = (x: number, y: number): THREE.Color => {
        const colorIndex = (y * totalVerticesX + x) * 3;
        return new THREE.Color().fromArray(colorData, colorIndex);
    }

    const addVertex = (pos: THREE.Vector3, color: THREE.Color, key: string): number => {
        if (vertexMap.has(key)) {
            return vertexMap.get(key)!;
        }
        
        const newIndex = newIndexCounter++;
        vertexMap.set(key, newIndex);
        vertices.push(pos.x, pos.y, pos.z);
        colors.push(color.r, color.g, color.b);
        return newIndex;
    };
    
    const addTriangle = (i1: number, i2: number, i3: number) => {
        indices.push(i1, i2, i3);
    };

    // Iterate over each quad cell of the terrain grid
    for (let y = 0; y < TERRAIN_SEGMENTS_Y; y++) {
        for (let x = 0; x < TERRAIN_SEGMENTS_X; x++) {
            // Define the 4 corners of the current cell
            const corners = [
                { x: x,     y: y },       // 0: bottom-left
                { x: x + 1, y: y },       // 1: bottom-right
                { x: x + 1, y: y + 1 },   // 2: top-right
                { x: x,     y: y + 1 },   // 3: top-left
            ];

            const cornerData = corners.map(c => {
                const pos = getVertexPosition(c.x, c.y);
                return { pos, height: pos.y, color: getVertexColor(c.x, c.y) };
            });

            // Determine the case index based on which corners are above water level
            let caseIndex = 0;
            if (cornerData[0].height > LAND_LEVEL) caseIndex |= 1;
            if (cornerData[1].height > LAND_LEVEL) caseIndex |= 2;
            if (cornerData[2].height > LAND_LEVEL) caseIndex |= 4;
            if (cornerData[3].height > LAND_LEVEL) caseIndex |= 8;

            if (caseIndex === 0) continue; // Cell is completely underwater

            // Calculate interpolated positions and colors for edge intersection points
            const edgePoints = [
                interpolateVertex(cornerData[0].pos, cornerData[1].pos, cornerData[0].height, cornerData[1].height),
                interpolateVertex(cornerData[1].pos, cornerData[2].pos, cornerData[1].height, cornerData[2].height),
                interpolateVertex(cornerData[2].pos, cornerData[3].pos, cornerData[2].height, cornerData[3].height),
                interpolateVertex(cornerData[3].pos, cornerData[0].pos, cornerData[3].height, cornerData[0].height),
            ];

            const tValues = [
                (LAND_LEVEL - cornerData[0].height) / (cornerData[1].height - cornerData[0].height),
                (LAND_LEVEL - cornerData[1].height) / (cornerData[2].height - cornerData[1].height),
                (LAND_LEVEL - cornerData[2].height) / (cornerData[3].height - cornerData[2].height),
                (LAND_LEVEL - cornerData[3].height) / (cornerData[0].height - cornerData[3].height),
            ];

            const edgeColors = [
                new THREE.Color().lerpColors(cornerData[0].color, cornerData[1].color, tValues[0]),
                new THREE.Color().lerpColors(cornerData[1].color, cornerData[2].color, tValues[1]),
                new THREE.Color().lerpColors(cornerData[2].color, cornerData[3].color, tValues[2]),
                new THREE.Color().lerpColors(cornerData[3].color, cornerData[0].color, tValues[3]),
            ];

            // Add vertices to the mesh geometry, using a key to avoid duplicates
            const v = cornerData.map((cd, i) => addVertex(cd.pos, cd.color, `v_${corners[i].x}_${corners[i].y}`));
            const e = edgePoints.map((p, i) => {
                // Create a canonical key for edge vertices to avoid duplicates
                const c1 = corners[i];
                const c2 = corners[(i + 1) % 4];
                const key = `e_${Math.min(c1.x, c2.x)}_${Math.min(c1.y, c2.y)}_${Math.max(c1.x, c2.x)}_${Math.max(c1.y, c2.y)}_${i%2}`;
                return addVertex(p, edgeColors[i], key);
            });
            
            // Triangulate the cell based on its case index (CCW winding order)
            switch (caseIndex) {
                case 1: addTriangle(v[0], e[0], e[3]); break;
                case 2: addTriangle(v[1], e[1], e[0]); break;
                case 3: addTriangle(v[0], v[1], e[1]); addTriangle(v[0], e[1], e[3]); break;
                case 4: addTriangle(v[2], e[2], e[1]); break;
                case 5: // Ambiguous case 1
                    addTriangle(v[0], e[0], e[3]);
                    addTriangle(v[2], e[2], e[1]);
                    break;
                case 6: addTriangle(v[1], v[2], e[2]); addTriangle(v[1], e[2], e[0]); break;
                case 7: // v3 out
                    addTriangle(v[0], v[1], v[2]);
                    addTriangle(v[0], v[2], e[2]);
                    addTriangle(v[0], e[2], e[3]);
                    break;
                case 8: addTriangle(v[3], e[3], e[2]); break;
                case 9: addTriangle(v[0], v[3], e[2]); addTriangle(v[0], e[2], e[0]); break;
                case 10: // Ambiguous case 2
                    addTriangle(v[1], e[1], e[0]);
                    addTriangle(v[3], e[3], e[2]);
                    break;
                case 11: // v2 out
                    addTriangle(v[0], v[1], e[1]);
                    addTriangle(v[0], e[1], e[2]);
                    addTriangle(v[0], e[2], v[3]);
                    break;
                case 12: addTriangle(v[3], v[2], e[1]); addTriangle(v[3], e[1], e[3]); break;
                case 13: // v1 out
                    addTriangle(v[0], e[0], e[1]);
                    addTriangle(v[0], e[1], v[2]);
                    addTriangle(v[0], v[2], v[3]);
                    break;
                case 14: // v0 out
                    addTriangle(v[1], v[2], v[3]);
                    addTriangle(v[1], v[3], e[3]);
                    addTriangle(v[1], e[3], e[0]);
                    break;
                case 15: // All in
                    addTriangle(v[0], v[1], v[2]);
                    addTriangle(v[0], v[2], v[3]);
                    break;
            }
        }
    }

    if (vertices.length === 0) {
        return null; // Nothing to export
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide });
    
    return new THREE.Mesh(geometry, material);
};


export const exportModel = (heightData: Float32Array, colorData: Float32Array, format: 'gltf' | 'glb' | 'obj') => {
    const mesh = createTerrainMeshForExport(heightData, colorData);
    
    if (!mesh) {
        alert("Nothing to export. Please sculpt some terrain above the water level first.");
        return;
    }
    
    switch (format) {
        case 'gltf':
        case 'glb': {
            const exporter = new GLTFExporter();
            exporter.parse(
                mesh,
                (result) => {
                    const filename = `terrain.${format}`;
                    if (result instanceof ArrayBuffer) {
                        saveDataToFile(result, filename);
                    } else {
                        const output = JSON.stringify(result, null, 2);
                        saveDataToFile(output, filename);
                    }
                },
                (error) => {
                    console.error('An error happened during GLTF export:', error);
                },
                { binary: format === 'glb' }
            );
            break;
        }
        case 'obj': {
            const exporter = new OBJExporter();
            const result = exporter.parse(mesh);
            saveDataToFile(result, 'terrain.obj');
            break;
        }
        default:
            console.error(`Unsupported export format: ${format}`);
    }
};