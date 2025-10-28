
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y } from '../constants';
import { Tool, BrushSettings } from '../types';

interface TerrainEditorProps {
    heightData: Float32Array;
    onTerrainUpdate: (intersectionPoint: THREE.Vector3, targetHeight?: number) => void;
    onPaintStart: () => void;
    onPaintEnd: () => void;
    tool: Tool;
    brushSettings: BrushSettings;
}

// Define colors for different elevation levels, including water.
const SNOW_LEVEL = 40;
const ROCK_LEVEL = 25;
const LAND_LEVEL = 0; // Sea level is at height 0

const snowColor = new THREE.Color(0xffffff);      // Pure white for peaks
const rockColor = new THREE.Color(0x999999);      // Grey for cliffs/rocks
const landColor = new THREE.Color(0xcccccc);      // Light grey for base terrain
const waterColor = new THREE.Color(0x5c95c9);     // Blue for water


export const TerrainEditor: React.FC<TerrainEditorProps> = ({ heightData, onTerrainUpdate, onPaintStart, onPaintEnd, tool, brushSettings }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const terrainMeshRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null>(null);
    const brushHelperRef = useRef<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const pointerRef = useRef(new THREE.Vector2());

    // --- Start of Fix ---
    // Create refs to hold the latest props and callbacks to avoid stale closures in event listeners.
    const onTerrainUpdateRef = useRef(onTerrainUpdate);
    const onPaintStartRef = useRef(onPaintStart);
    const onPaintEndRef = useRef(onPaintEnd);
    const toolRef = useRef(tool);

    // Keep the refs updated with the latest functions/values from props on every render.
    useEffect(() => { onTerrainUpdateRef.current = onTerrainUpdate; }, [onTerrainUpdate]);
    useEffect(() => { onPaintStartRef.current = onPaintStart; }, [onPaintStart]);
    useEffect(() => { onPaintEndRef.current = onPaintEnd; }, [onPaintEnd]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    // --- End of Fix ---

    const isPaintingRef = useRef(false);
    const flattenTargetHeightRef = useRef<number | null>(null);

    const updateTerrainGeometry = useCallback(() => {
        if (terrainMeshRef.current) {
            const geometry = terrainMeshRef.current.geometry;
            const positions = geometry.attributes.position;
            
            for (let i = 0; i < heightData.length; i++) {
                positions.setY(i, heightData[i]);
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();

            if (!geometry.attributes.color) {
                const colors = new Float32Array(positions.count * 3);
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }

            const colors = geometry.attributes.color;
            const tempColor = new THREE.Color();

            for (let i = 0; i < positions.count; i++) {
                const height = positions.getY(i);
                if (height >= SNOW_LEVEL) {
                    tempColor.copy(snowColor);
                } else if (height >= ROCK_LEVEL) {
                    // Blend from rock to snow
                    const t = (height - ROCK_LEVEL) / (SNOW_LEVEL - ROCK_LEVEL);
                    tempColor.lerpColors(rockColor, snowColor, t);
                } else if (height >= LAND_LEVEL) {
                    // Blend from land to rock
                    const t = (height - LAND_LEVEL) / (ROCK_LEVEL - LAND_LEVEL);
                    tempColor.lerpColors(landColor, rockColor, t);
                } else {
                    // Below land level is water
                    tempColor.copy(waterColor);
                }
                colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
            }
            colors.needsUpdate = true;
        }
    }, [heightData]);

    useEffect(() => {
        if (!mountRef.current || rendererRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x334155);
        scene.fog = new THREE.Fog(0x334155, 500, 2000);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 2000);
        camera.position.set(0, 300, 350);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.screenSpacePanning = false;
        controls.minDistance = 50;
        controls.maxDistance = 1000;
        controls.maxPolarAngle = Math.PI / 2.1;
        controlsRef.current = controls;

        const ambientLight = new THREE.AmbientLight(0xaaaaaa);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(200, 400, 300);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const geometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            wireframe: false,
            side: THREE.DoubleSide,
            vertexColors: true,
        });
        const terrainMesh = new THREE.Mesh(geometry, material);
        terrainMesh.receiveShadow = true;
        scene.add(terrainMesh);
        terrainMeshRef.current = terrainMesh;

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
            renderer.render(scene, camera);
        };
        animate();

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
            if (!mountRef.current) return;
            const rect = mountRef.current.getBoundingClientRect();
            pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycasterRef.current.setFromCamera(pointerRef.current, camera);
            const intersects = raycasterRef.current.intersectObject(terrainMeshRef.current!);
            if (intersects.length > 0) {
                const intersection = intersects[0];
                if (brushHelperRef.current) {
                    brushHelperRef.current.position.copy(intersection.point);
                    brushHelperRef.current.position.y += 0.1;
                    brushHelperRef.current.visible = true;
                }
                if (isPaintingRef.current) {
                    // Use the ref to call the latest callback, ensuring it has fresh state.
                    onTerrainUpdateRef.current(intersection.point, flattenTargetHeightRef.current ?? undefined);
                }
            } else {
                if (brushHelperRef.current) {
                    brushHelperRef.current.visible = false;
                }
            }
        };

        const onPointerDown = (event: PointerEvent) => {
            if (event.button === 0) { // Left mouse button
                isPaintingRef.current = true;
                controlsRef.current!.enabled = false;
                onPaintStartRef.current(); // Use ref to call latest callback

                 if (toolRef.current === Tool.Flatten) { // Use ref to get latest tool
                    raycasterRef.current.setFromCamera(pointerRef.current, camera);
                    const intersects = raycasterRef.current.intersectObject(terrainMeshRef.current!);
                    if (intersects.length > 0) {
                        flattenTargetHeightRef.current = intersects[0].point.y;
                    }
                }
            }
        };

        const onPointerUp = (event: PointerEvent) => {
            if (event.button === 0) {
                isPaintingRef.current = false;
                controlsRef.current!.enabled = true;
                flattenTargetHeightRef.current = null;
                onPaintEndRef.current(); // Use ref to call latest callback
            }
        };

        mountRef.current.addEventListener('pointermove', onPointerMove);
        mountRef.current.addEventListener('pointerdown', onPointerDown);
        mountRef.current.addEventListener('pointerup', onPointerUp);
        window.addEventListener('resize', handleResize);

        return () => {
            if (mountRef.current) {
                mountRef.current.removeEventListener('pointermove', onPointerMove);
                mountRef.current.removeEventListener('pointerdown', onPointerDown);
                mountRef.current.removeEventListener('pointerup', onPointerUp);
                 if (rendererRef.current?.domElement) {
                    mountRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        updateTerrainGeometry();
    }, [heightData, updateTerrainGeometry]);

    useEffect(() => {
        if(brushHelperRef.current) {
            const size = brushSettings.size / 2;
            brushHelperRef.current.geometry.dispose();
            brushHelperRef.current.geometry = new THREE.RingGeometry(size, size + 1, 64);
        }
    }, [brushSettings.size]);

    return <div ref={mountRef} className="w-full h-full cursor-none" />;
};
