import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { 
    TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y,
    NUM_CHUNKS_X, NUM_CHUNKS_Y, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_SEGMENTS_X, CHUNK_SEGMENTS_Y, LOD_LEVELS,
    LAND_LEVEL, waterColor, sandColor, SEA_FLOOR_LEVEL
} from '../constants';
import { Tool, BrushSettings } from '../types';

interface TerrainEditorProps {
    heightData: Float32Array;
    colorData: Float32Array;
    onTerrainUpdate: (intersectionPoint: THREE.Vector3, sampledHeight?: number) => void;
    onPaintStart: () => void;
    onPaintEnd: () => void;
    tool: Tool;
    brushSettings: BrushSettings;
    sunBrightness: number;
}

export const TerrainEditor: React.FC<TerrainEditorProps> = ({ 
    heightData, colorData, onTerrainUpdate, onPaintStart, onPaintEnd, tool, brushSettings, sunBrightness 
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const terrainLodsRef = useRef<THREE.LOD[]>([]);
    const brushHelperRef = useRef<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const pointerRef = useRef(new THREE.Vector2());
    const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

    const isPaintingRef = useRef(false);
    const strokeTargetHeightRef = useRef<number | null>(null);

    const updateTerrainGeometry = useCallback(() => {
        if (terrainLodsRef.current.length === 0) return;

        const totalVerticesX = TERRAIN_SEGMENTS_X + 1;

        terrainLodsRef.current.forEach((lod, chunkIndex) => {
            const chunkX = chunkIndex % NUM_CHUNKS_X;
            const chunkY = Math.floor(chunkIndex / NUM_CHUNKS_X);

            lod.levels.forEach(level => {
                const mesh = level.object as THREE.Mesh<THREE.PlaneGeometry>;
                const geometry = mesh.geometry;
                const positions = geometry.attributes.position;
                const colors = geometry.attributes.color as THREE.BufferAttribute;
                
                const chunkSegmentsX = geometry.parameters.widthSegments;
                const chunkSegmentsY = geometry.parameters.heightSegments;
                const chunkVerticesX = chunkSegmentsX + 1;
                const chunkVerticesY = chunkSegmentsY + 1;
                const segmentRatio = CHUNK_SEGMENTS_X / chunkSegmentsX;

                for (let y = 0; y < chunkVerticesY; y++) {
                    for (let x = 0; x < chunkVerticesX; x++) {
                        const globalX = chunkX * CHUNK_SEGMENTS_X + (x * segmentRatio);
                        const globalY = chunkY * CHUNK_SEGMENTS_Y + (y * segmentRatio);
                        const globalIndex = globalY * totalVerticesX + globalX;
                        
                        const height = heightData[globalIndex];
                        const color = new THREE.Color().fromArray(colorData, globalIndex * 3);

                        const localIndex = y * chunkVerticesX + x;
                        positions.setY(localIndex, height);
                        colors.setXYZ(localIndex, color.r, color.g, color.b);
                    }
                }
                
                positions.needsUpdate = true;
                colors.needsUpdate = true;
                geometry.computeVertexNormals();
            });
        });
    }, [heightData, colorData]);

    useEffect(() => {
        if (!mountRef.current) return;
        
        // Only initialize scene once
        if(!rendererRef.current) {
            const scene = new THREE.Scene();
            scene.background = waterColor;
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 100, TERRAIN_WIDTH * 2);
            camera.position.set(0, 30000, 35000);
            cameraRef.current = camera;

            const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            mountRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.screenSpacePanning = false;
            controls.minDistance = 500;
            controls.maxDistance = TERRAIN_WIDTH * 2;
            controls.maxPolarAngle = Math.PI / 2.1;
            controlsRef.current = controls;

            const ambientLight = new THREE.AmbientLight(0xaaaaaa);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
            directionalLight.position.set(40000, 80000, 60000);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            const shadowCamSize = TERRAIN_WIDTH / 2;
            directionalLight.shadow.camera.top = shadowCamSize;
            directionalLight.shadow.camera.bottom = -shadowCamSize;
            directionalLight.shadow.camera.left = -shadowCamSize;
            directionalLight.shadow.camera.right = -shadowCamSize;
            directionalLight.shadow.camera.near = 1;
            directionalLight.shadow.camera.far = 150000;
            scene.add(directionalLight);
            directionalLightRef.current = directionalLight;

            const waterGeometry = new THREE.PlaneGeometry(TERRAIN_WIDTH * 10, TERRAIN_HEIGHT * 10);
            const waterMaterial = new THREE.MeshStandardMaterial({
                color: waterColor,
                transparent: true,
                opacity: 0.7,
                metalness: 0.3,
                roughness: 0.4,
            });
            const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
            waterMesh.rotation.x = -Math.PI / 2;
            waterMesh.position.y = LAND_LEVEL;
            scene.add(waterMesh);

            const seabedGeometry = new THREE.PlaneGeometry(TERRAIN_WIDTH * 10, TERRAIN_HEIGHT * 10);
            const seabedMaterial = new THREE.MeshStandardMaterial({ color: sandColor });
            const seabedMesh = new THREE.Mesh(seabedGeometry, seabedMaterial);
            seabedMesh.rotation.x = -Math.PI / 2;
            seabedMesh.position.y = SEA_FLOOR_LEVEL - 100;
            seabedMesh.receiveShadow = true;
            scene.add(seabedMesh);
            
            const sharedMaterial = new THREE.MeshStandardMaterial({
                wireframe: false,
                side: THREE.DoubleSide,
                vertexColors: true,
            });

            // FIX: Add dithering via onBeforeCompile to break up moiré patterns
            sharedMaterial.onBeforeCompile = (shader) => {
                shader.fragmentShader = `
                    float random(vec2 st) {
                        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                    }
                ` + shader.fragmentShader;

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `
                    #include <dithering_fragment>
                    float noise = (random(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);
                    gl_FragColor.rgb += noise;
                    `
                );
            };


            const lods: THREE.LOD[] = [];
            for (let y = 0; y < NUM_CHUNKS_Y; y++) {
                for (let x = 0; x < NUM_CHUNKS_X; x++) {
                    const lod = new THREE.LOD();
                    lod.position.x = (x - (NUM_CHUNKS_X / 2) + 0.5) * CHUNK_WIDTH;
                    lod.position.z = (y - (NUM_CHUNKS_Y / 2) + 0.5) * CHUNK_HEIGHT;
                    
                    LOD_LEVELS.forEach(({ distance, segments }) => {
                        const geometry = new THREE.PlaneGeometry(CHUNK_WIDTH, CHUNK_HEIGHT, segments, segments);
                        geometry.rotateX(-Math.PI / 2);

                        const vertexCount = (segments + 1) * (segments + 1);
                        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));

                        const mesh = new THREE.Mesh(geometry, sharedMaterial);
                        mesh.receiveShadow = true;
                        mesh.castShadow = true;
                        lod.addLevel(mesh, distance);
                    });

                    scene.add(lod);
                    lods.push(lod);
                }
            }
            terrainLodsRef.current = lods;

            const brushGeometry = new THREE.RingGeometry(1, 1.2, 64);
            const brushMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
            const brushHelper = new THREE.Mesh(brushGeometry, brushMaterial);
            brushHelper.rotateX(Math.PI / 2);
            brushHelper.visible = false;
            scene.add(brushHelper);
            brushHelperRef.current = brushHelper;
            
            updateTerrainGeometry();

            const animate = () => {
                requestAnimationFrame(animate);
                controls.update();
                terrainLodsRef.current.forEach(lod => lod.update(camera));
                renderer.render(scene, camera);
            };
            animate();
        }

        const handleResize = () => {
            if (mountRef.current && rendererRef.current && cameraRef.current) {
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;
                rendererRef.current.setSize(width, height);
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            if (!mountRef.current || !cameraRef.current || terrainLodsRef.current.length === 0) return;
            const rect = mountRef.current.getBoundingClientRect();
            pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
            const intersects = raycasterRef.current.intersectObjects(terrainLodsRef.current, true);
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                if (brushHelperRef.current) {
                    brushHelperRef.current.position.copy(intersection.point);
                    brushHelperRef.current.position.y += 0.1;
                    brushHelperRef.current.visible = true;
                }
                if (isPaintingRef.current) {
                    onTerrainUpdate(intersection.point, strokeTargetHeightRef.current ?? undefined);
                }
            } else {
                if (brushHelperRef.current) {
                    brushHelperRef.current.visible = false;
                }
            }
        };

        const onPointerDown = (event: PointerEvent) => {
            if (event.button === 0) { // Left mouse button
                if (!cameraRef.current || terrainLodsRef.current.length === 0) return;

                raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
                const intersects = raycasterRef.current.intersectObjects(terrainLodsRef.current, true);
                if (intersects.length === 0) return; // Don't start painting if not clicking on terrain

                isPaintingRef.current = true;
                if (controlsRef.current) controlsRef.current.enabled = false;
                onPaintStart();

                if (tool === Tool.Flatten || tool === Tool.Plane) {
                    const intersection = intersects[0];
                    let targetHeight = intersection.point.y;

                    if (tool === Tool.Plane && targetHeight < LAND_LEVEL) {
                        // If clicking on water/seabed, create an island at land level
                        targetHeight = LAND_LEVEL;
                    }
                    strokeTargetHeightRef.current = targetHeight;
                }
            }
        };
        
        const onPointerUp = (event: PointerEvent) => {
            if (event.button === 0) {
                isPaintingRef.current = false;
                if (controlsRef.current) controlsRef.current.enabled = true;
                strokeTargetHeightRef.current = null;
                onPaintEnd();
            }
        };

        const currentMount = mountRef.current;
        currentMount.addEventListener('pointermove', onPointerMove);
        currentMount.addEventListener('pointerdown', onPointerDown);
        currentMount.addEventListener('pointerup', onPointerUp);
        window.addEventListener('resize', handleResize);

        return () => {
            currentMount.removeEventListener('pointermove', onPointerMove);
            currentMount.removeEventListener('pointerdown', onPointerDown);
            currentMount.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', handleResize);
        };
    }, [onPaintEnd, onPaintStart, onTerrainUpdate, tool, updateTerrainGeometry]);

    useEffect(() => {
        updateTerrainGeometry();
    }, [heightData, colorData, updateTerrainGeometry]);

    useEffect(() => {
        if(brushHelperRef.current) {
            const size = brushSettings.size / 2;
            brushHelperRef.current.geometry.dispose();
            // Add a small constant to the inner radius to prevent it from being zero or negative
            brushHelperRef.current.geometry = new THREE.RingGeometry(size, size + (size * 0.05) + 10, 64);
        }
    }, [brushSettings.size]);

    useEffect(() => {
        if (directionalLightRef.current) {
            directionalLightRef.current.intensity = sunBrightness;
        }
    }, [sunBrightness]);

    return <div ref={mountRef} className="w-full h-full cursor-none" />;
};