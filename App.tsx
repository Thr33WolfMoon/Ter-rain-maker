import React, { useState, useCallback, useEffect } from 'react';
import { Vector3, Color } from 'three';
import { TerrainEditor } from './components/TerrainEditor';
import { Toolbar } from './components/Toolbar';
import { useUndoableState } from './hooks/useUndoableState';
import { applyBrush, generateInitialColorData } from './services/terrainUtils';
import { Tool, BrushSettings } from './types';
import { TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y, SEA_FLOOR_LEVEL, PAINT_PALETTE } from './constants';

const App: React.FC = () => {
    const [tool, setTool] = useState<Tool>(Tool.Raise);
    const [brushSettings, setBrushSettings] = useState<BrushSettings>({
        size: 10000,
    });
    const [paintColor, setPaintColor] = useState<Color>(PAINT_PALETTE[0].color);

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
        const options: { targetHeight?: number; paintColor?: Color } = { paintColor };

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
    }, [liveState, tool, brushSettings, paintColor]);

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
                />
            </main>
             <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 p-2 rounded-lg text-xs text-gray-300">
                Controls: [LMB + Drag] Sculpt/Paint | [RMB + Drag] Orbit | [Scroll] Zoom | [MMB + Drag] Pan
            </div>
        </div>
    );
};

export default App;