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

// Creates a trimmed, high-res mesh from height and color data, focusing only on the sculpted area
const createTrimmedTerrainMesh = (heightData: Float32Array, colorData: Float32Array): THREE.Mesh | null => {
    const totalVerticesX = TERRAIN_SEGMENTS_X + 1;
    const totalVerticesY = TERRAIN_SEGMENTS_Y + 1;

    // 1. Find the bounding box of the sculpted area (anything above water level)
    let minX = TERRAIN_SEGMENTS_X;
    let minY = TERRAIN_SEGMENTS_Y;
    let maxX = 0;
    let maxY = 0;
    let foundSculpt = false;

    for (let y = 0; y < totalVerticesY; y++) {
        for (let x = 0; x < totalVerticesX; x++) {
            const index = y * totalVerticesX + x;
            if (heightData[index] > LAND_LEVEL) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                foundSculpt = true;
            }
        }
    }

    if (!foundSculpt) {
        return null; // No terrain above water to export
    }

    // 2. Add some padding to the bounding box to ensure edges aren't cut off sharply
    const padding = 2;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(TERRAIN_SEGMENTS_X, maxX + padding);
    maxY = Math.min(TERRAIN_SEGMENTS_Y, maxY + padding);

    const segmentsX = maxX - minX;
    const segmentsY = maxY - minY;

    if (segmentsX <= 0 || segmentsY <= 0) {
        return null; // Nothing to export if the area is just a line or point
    }
    
    // 3. Create a new geometry sized to the trimmed area
    const newWidth = (segmentsX / TERRAIN_SEGMENTS_X) * TERRAIN_WIDTH;
    const newHeight = (segmentsY / TERRAIN_SEGMENTS_Y) * TERRAIN_HEIGHT;
    
    const geometry = new THREE.PlaneGeometry(newWidth, newHeight, segmentsX, segmentsY);
    geometry.rotateX(-Math.PI / 2);

    const newPositions = geometry.attributes.position;
    const newColorData = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 3);
    
    // 4. Copy the relevant height and color data from the original arrays to the new geometry
    for (let y = 0; y <= segmentsY; y++) {
        for (let x = 0; x <= segmentsX; x++) {
            const originalX = minX + x;
            const originalY = minY + y;
            
            const originalIndex = originalY * totalVerticesX + originalX;
            const newIndex = y * (segmentsX + 1) + x;

            const height = heightData[originalIndex];
            newPositions.setY(newIndex, Math.max(height, LAND_LEVEL)); // Clamp at water level

            const colorIndex = originalIndex * 3;
            const newColorIndex = newIndex * 3;
            newColorData[newColorIndex] = colorData[colorIndex];
            newColorData[newColorIndex + 1] = colorData[colorIndex + 1];
            newColorData[newColorIndex + 2] = colorData[colorIndex + 2];
        }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(newColorData, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);

    // 5. Position the new, smaller mesh correctly in world space so its location matches the original
    const centerX = ((minX + maxX) / 2 / TERRAIN_SEGMENTS_X - 0.5) * TERRAIN_WIDTH;
    const centerZ = ((minY + maxY) / 2 / TERRAIN_SEGMENTS_Y - 0.5) * TERRAIN_HEIGHT;
    mesh.position.set(centerX, 0, centerZ);
    
    return mesh;
};


export const exportModel = (heightData: Float32Array, colorData: Float32Array, format: 'gltf' | 'glb' | 'obj') => {
    const mesh = createTrimmedTerrainMesh(heightData, colorData);
    
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