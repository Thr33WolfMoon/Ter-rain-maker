
import React, { useState, useCallback, useEffect } from 'react';
import { Vector3 } from 'three';
import { TerrainEditor } from './components/TerrainEditor';
import { Toolbar } from './components/Toolbar';
import { useUndoableState } from './hooks/useUndoableState';
import { applyBrush } from './services/terrainUtils';
import { Tool, BrushSettings } from './types';
import { TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Y } from './constants';

const App: React.FC = () => {
    const [tool, setTool] = useState<Tool>(Tool.Raise);
    const [brushSettings, setBrushSettings] = useState<BrushSettings>({
        size: 50,
        strength: 0.5,
    });

    const initialHeightData = new Float32Array((TERRAIN_SEGMENTS_X + 1) * (TERRAIN_SEGMENTS_Y + 1)).fill(-10);
    const [committedHeightData, setCommittedHeightData, undo, redo, canUndo, canRedo] = useUndoableState<Float32Array>(initialHeightData);
    
    // 'liveHeightData' is what's actively being edited and rendered.
    // It's synced with the committed state from the undo/redo history.
    const [liveHeightData, setLiveHeightData] = useState(committedHeightData);

    useEffect(() => {
        // When undo/redo changes the committed state, update the live view.
        setLiveHeightData(committedHeightData);
    }, [committedHeightData]);
    
    const handlePaintStart = useCallback(() => {
        // The first terrain update will use the current live data as its base.
    }, []);

    const handlePaintEnd = useCallback(() => {
        // When the user releases the mouse, commit the result of the stroke to history.
        setCommittedHeightData(liveHeightData);
    }, [liveHeightData, setCommittedHeightData]);

    const handleTerrainUpdate = useCallback((intersectionPoint: Vector3, targetHeight?: number) => {
        // During a paint stroke, continuously update the live data for real-time feedback.
        const newHeightData = applyBrush(liveHeightData, intersectionPoint, tool, brushSettings, targetHeight);
         if (newHeightData) {
            setLiveHeightData(newHeightData);
        }
    }, [liveHeightData, tool, brushSettings]);

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
            />
            <main className="flex-1 h-full">
                <TerrainEditor 
                    heightData={liveHeightData} 
                    onTerrainUpdate={handleTerrainUpdate}
                    onPaintStart={handlePaintStart}
                    onPaintEnd={handlePaintEnd}
                    tool={tool}
                    brushSettings={brushSettings}
                />
            </main>
             <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 p-2 rounded-lg text-xs text-gray-300">
                Controls: [LMB + Drag] Sculpt | [RMB + Drag] Orbit | [Scroll] Zoom | [MMB + Drag] Pan
            </div>
        </div>
    );
};

export default App;