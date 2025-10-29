
import React, { useState, useCallback, useEffect } from 'react';
import { Vector3, Color } from 'three';
import { TerrainEditor } from './components/TerrainEditor';
import { Toolbar } from './components/Toolbar';
import { useUndoableState } from './hooks/useUndoableState';
import { applyBrush, generateInitialColorData, applyGlobalSmooth, applyGlobalFlatten } from './services/terrainUtils';
import { exportModel } from './services/exportService';
import { processPaletteImage } from './services/paletteService';
import { Tool, BrushSettings, PaintMode } from './types';
import { TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y, SEA_FLOOR_LEVEL, PAINT_PALETTE } from './constants';

const App: React.FC = () => {
    const [tool, setTool] = useState<Tool>(Tool.Raise);
    const [brushSettings, setBrushSettings] = useState<BrushSettings>({
        size: 10000,
    });
    const [paintColor, setPaintColor] = useState<Color>(PAINT_PALETTE[0].color);
    const [sunBrightness, setSunBrightness] = useState<number>(1.5);
    const [paintPalette, setPaintPalette] = useState(PAINT_PALETTE);
    const [isImportingPalette, setIsImportingPalette] = useState(false);
    const [paintMode, setPaintMode] = useState<PaintMode>('color');
    const [paintTexture, setPaintTexture] = useState<HTMLImageElement | null>(null);
    const [isImportingTexture, setIsImportingTexture] = useState(false);

    const initialHeightData = new Float32Array((TERRAIN_SEGMENTS_X + 1) * (TERRAIN_SEGMENTS_Y + 1)).fill(SEA_FLOOR_LEVEL);
    const initialColorData = generateInitialColorData(initialHeightData);

    const [committedState, setCommittedState, undo, redo, canUndo, canRedo] = useUndoableState({
        heightData: initialHeightData,
        colorData: initialColorData,
    });
    
    const [liveState, setLiveState] = useState(committedState);

    useEffect(() => {
        setLiveState(committedState);
    }, [committedState]);
    
    const handlePaintStart = useCallback(() => {
    }, []);

    const handlePaintEnd = useCallback(() => {
        setCommittedState(liveState);
    }, [liveState, setCommittedState]);

    const handleTerrainUpdate = useCallback((intersectionPoint: Vector3, sampledHeight?: number) => {
        const options: { 
            targetHeight?: number; 
            paintColor?: Color;
            paintMode?: PaintMode;
            paintTexture?: HTMLImageElement | null;
        } = { 
            paintColor,
            paintMode,
            paintTexture,
        };

        // For Flatten and Plane, the target height is sampled from the terrain on pointer down.
        if (tool === Tool.Flatten || tool === Tool.Plane) {
            options.targetHeight = sampledHeight;
        }

        const newDatas = applyBrush(
            liveState.heightData,
            liveState.colorData,
            intersectionPoint,
            tool,
            brushSettings,
            options
        );
         if (newDatas) {
            setLiveState(newDatas);
        }
    }, [liveState, tool, brushSettings, paintColor, paintMode, paintTexture]);
    
    const handleExport = useCallback((format: 'gltf' | 'glb' | 'obj') => {
        exportModel(committedState.heightData, committedState.colorData, format);
    }, [committedState]);
    
    const handleErosion = useCallback(() => {
        const { heightData, colorData } = applyGlobalSmooth(committedState.heightData, 0.1);
        setCommittedState({ heightData, colorData });
    }, [committedState, setCommittedState]);
    
    const handleGlobalFlatten = useCallback(() => {
        const { heightData, colorData } = applyGlobalFlatten(committedState.heightData, 0.1);
        setCommittedState({ heightData, colorData });
    }, [committedState, setCommittedState]);

    const handleImportPalette = useCallback(async (file: File) => {
        setIsImportingPalette(true);
        try {
            const newPalette = await processPaletteImage(file);
            if (newPalette && newPalette.length > 0) {
                setPaintPalette(newPalette);
                setPaintColor(newPalette[0].color); 
            } else {
                alert('Could not extract a palette from the image. Please try another one.');
            }
        } catch (error) {
            console.error("Error importing palette:", error);
            alert('Failed to import palette.');
        } finally {
            setIsImportingPalette(false);
        }
    }, []);

    const handleImportTexture = useCallback(async (file: File) => {
        setIsImportingTexture(true);
        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setPaintTexture(img);
                    setPaintMode('texture'); // Switch to texture mode automatically
                    setIsImportingTexture(false);
                };
                img.onerror = () => {
                    alert('Failed to load image.');
                    setIsImportingTexture(false);
                };
                img.src = event.target?.result as string;
            };
            reader.onerror = () => {
                alert('Failed to read file.');
                setIsImportingTexture(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error importing texture:", error);
            alert('Failed to import texture.');
            setIsImportingTexture(false);
        }
    }, []);


    return (
        <div className="w-screen h-screen flex">
            <Toolbar
                activeTool={tool}
                onSetTool={setTool}
                brushSettings={brushSettings}
                onSetBrushSettings={setBrushSettings}
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                paintColor={paintColor}
                onSetPaintColor={setPaintColor}
                sunBrightness={sunBrightness}
                onSetSunBrightness={setSunBrightness}
                onExport={handleExport}
                onErosion={handleErosion}
                onGlobalFlatten={handleGlobalFlatten}
                paintPalette={paintPalette}
                onImportPalette={handleImportPalette}
                isImportingPalette={isImportingPalette}
                paintMode={paintMode}
                onSetPaintMode={setPaintMode}
                paintTexture={paintTexture}
                onImportTexture={handleImportTexture}
                isImportingTexture={isImportingTexture}
            />
            <main className="flex-1 h-full">
                <TerrainEditor 
                    heightData={liveState.heightData}
                    colorData={liveState.colorData}
                    onTerrainUpdate={handleTerrainUpdate}
                    onPaintStart={handlePaintStart}
                    onPaintEnd={handlePaintEnd}
                    tool={tool}
                    brushSettings={brushSettings}
                    sunBrightness={sunBrightness}
                    undo={undo}
                    redo={redo}
                />
            </main>
             <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 p-2 rounded-lg text-xs text-gray-300">
                Controls: [LMB + Drag] Sculpt/Paint | [RMB + Drag] Orbit | [Scroll] Zoom | [MMB + Drag] Pan
            </div>
        </div>
    );
};

export default App;