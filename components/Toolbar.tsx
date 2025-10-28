import React from 'react';
import { Tool, BrushSettings } from '../types';
import { RaiseIcon, LowerIcon, FlattenIcon, SmoothIcon, PaintIcon, PlaneIcon, UndoIcon, RedoIcon } from './Icon';
import { PAINT_PALETTE } from '../constants';
import { Color } from 'three';


interface ToolbarProps {
    activeTool: Tool;
    onSetTool: (tool: Tool) => void;
    brushSettings: BrushSettings;
    onSetBrushSettings: (settings: BrushSettings) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    paintColor: Color;
    onSetPaintColor: (color: Color) => void;
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
    activeTool, onSetTool, brushSettings, onSetBrushSettings, undo, redo, canUndo, canRedo, paintColor, onSetPaintColor
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
                    <ToolButton label="Plane" icon={<PlaneIcon />} isActive={activeTool === Tool.Plane} onClick={() => onSetTool(Tool.Plane)} />
                    <ToolButton label="Smooth" icon={<SmoothIcon />} isActive={activeTool === Tool.Smooth} onClick={() => onSetTool(Tool.Smooth)} />
                    <ToolButton label="Paint" icon={<PaintIcon />} isActive={activeTool === Tool.Paint} onClick={() => onSetTool(Tool.Paint)} />
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
                            max="40000"
                            value={brushSettings.size}
                            onChange={(e) => onSetBrushSettings({ ...brushSettings, size: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {activeTool === Tool.Paint && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 mb-3">Palette</h2>
                    <div className="grid grid-cols-4 gap-2">
                        {PAINT_PALETTE.map(({ name, color }) => (
                            <button
                                key={name}
                                title={name}
                                onClick={() => onSetPaintColor(color)}
                                className={`w-full aspect-square rounded-md transition-all border-2 ${
                                    paintColor.equals(color) ? 'border-indigo-400 scale-110' : 'border-gray-700 hover:border-gray-500'
                                }`}
                                style={{ backgroundColor: `#${color.getHexString()}` }}
                                aria-label={`Paint with ${name} color`}
                            />
                        ))}
                    </div>
                </div>
            )}
            
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