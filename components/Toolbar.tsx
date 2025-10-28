
import React from 'react';
import { Tool, BrushSettings } from '../types';
import { RaiseIcon, LowerIcon, FlattenIcon, SmoothIcon, UndoIcon, RedoIcon } from './Icon';

interface ToolbarProps {
    activeTool: Tool;
    onSetTool: (tool: Tool) => void;
    brushSettings: BrushSettings;
    onSetBrushSettings: (settings: BrushSettings) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const ToolButton: React.FC<{
    label: string,
    icon: React.ReactNode,
    isActive: boolean,
    onClick: () => void
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        title={label}
        className={`flex flex-col items-center justify-center w-full p-3 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {icon}
        <span className="text-xs mt-1">{label}</span>
    </button>
);


export const Toolbar: React.FC<ToolbarProps> = ({
    activeTool, onSetTool, brushSettings, onSetBrushSettings, undo, redo, canUndo, canRedo
}) => {

    return (
        <aside className="w-64 bg-gray-900 p-4 flex flex-col space-y-6 overflow-y-auto shadow-lg">
            <h1 className="text-2xl font-bold text-center text-indigo-400">Terrain Forge</h1>

            <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Tools</h2>
                <div className="grid grid-cols-2 gap-2">
                    <ToolButton label="Raise" icon={<RaiseIcon />} isActive={activeTool === Tool.Raise} onClick={() => onSetTool(Tool.Raise)} />
                    <ToolButton label="Lower" icon={<LowerIcon />} isActive={activeTool === Tool.Lower} onClick={() => onSetTool(Tool.Lower)} />
                    <ToolButton label="Flatten" icon={<FlattenIcon />} isActive={activeTool === Tool.Flatten} onClick={() => onSetTool(Tool.Flatten)} />
                    <ToolButton label="Smooth" icon={<SmoothIcon />} isActive={activeTool === Tool.Smooth} onClick={() => onSetTool(Tool.Smooth)} />
                </div>
            </div>

            <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Brush Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="brush-size" className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>Size</span>
                            <span>{brushSettings.size.toFixed(0)}</span>
                        </label>
                        <input
                            id="brush-size"
                            type="range"
                            min="1"
                            max="200"
                            value={brushSettings.size}
                            onChange={(e) => onSetBrushSettings({ ...brushSettings, size: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="brush-strength" className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>Strength</span>
                            <span>{(brushSettings.strength * 100).toFixed(0)}%</span>
                        </label>
                         <input
                            id="brush-strength"
                            type="range"
                            min="0.01"
                            max="1"
                            step="0.01"
                            value={brushSettings.strength}
                            onChange={(e) => onSetBrushSettings({ ...brushSettings, strength: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>
            </div>
            
            <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">History</h2>
                <div className="flex space-x-2">
                    <button onClick={undo} disabled={!canUndo} className="flex-1 flex items-center justify-center p-2 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors">
                        <UndoIcon />
                        <span className="ml-2">Undo</span>
                    </button>
                    <button onClick={redo} disabled={!canRedo} className="flex-1 flex items-center justify-center p-2 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors">
                        <RedoIcon />
                        <span className="ml-2">Redo</span>
                    </button>
                </div>
            </div>

        </aside>
    );
};
