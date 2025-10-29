
import React from 'react';
import { Tool, BrushSettings, PaintMode, TextureSettings } from '../types';
import { RaiseIcon, LowerIcon, FlattenIcon, SmoothIcon, PaintIcon, PlaneIcon, UndoIcon, RedoIcon, ExportIcon, ErosionIcon, ImportPaletteIcon, ImportTextureIcon } from './Icon';
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
    sunBrightness: number;
    onSetSunBrightness: (value: number) => void;
    onExport: (format: 'gltf' | 'glb' | 'obj') => void;
    onErosion: () => void;
    onGlobalFlatten: () => void;
    paintPalette: { name: string, color: Color }[];
    onImportPalette: (file: File) => void;
    isImportingPalette: boolean;
    paintMode: PaintMode;
    onSetPaintMode: (mode: PaintMode) => void;
    paintTexture: HTMLImageElement | null;
    onImportTexture: (file: File) => void;
    isImportingTexture: boolean;
    textureSettings: TextureSettings;
    onSetTextureSettings: (settings: TextureSettings) => void;
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
    activeTool, onSetTool, brushSettings, onSetBrushSettings, undo, redo, canUndo, canRedo, paintColor, onSetPaintColor,
    sunBrightness, onSetSunBrightness, onExport, onErosion, onGlobalFlatten, paintPalette, onImportPalette, isImportingPalette,
    paintMode, onSetPaintMode, paintTexture, onImportTexture, isImportingTexture, textureSettings, onSetTextureSettings
}) => {
    
    const handlePaletteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportPalette(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleTextureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportTexture(e.target.files[0]);
        }
        e.target.value = '';
    };

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
            
            <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Scene Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="sun-brightness" className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>Sun Brightness</span>
                            <span>{sunBrightness.toFixed(2)}</span>
                        </label>
                        <input
                            id="sun-brightness"
                            type="range"
                            min="0"
                            max="3"
                            step="0.05"
                            value={sunBrightness}
                            onChange={(e) => onSetSunBrightness(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {activeTool === Tool.Paint && (
                <div>
                     <div className="flex bg-gray-800 rounded-lg p-1 mb-3">
                        <button
                            onClick={() => onSetPaintMode('color')}
                            className={`flex-1 text-sm py-1 rounded-md transition-colors ${paintMode === 'color' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}
                        >
                            Color
                        </button>
                        <button
                            onClick={() => onSetPaintMode('texture')}
                            className={`flex-1 text-sm py-1 rounded-md transition-colors ${paintMode === 'texture' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}
                        >
                            Texture
                        </button>
                    </div>
                
                    {paintMode === 'color' && (
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-sm font-semibold text-gray-400">Palette</h2>
                                <label htmlFor="palette-file-input" title="Import Palette from PNG" className={`cursor-pointer text-indigo-400 hover:text-indigo-300 ${isImportingPalette ? 'animate-spin' : ''}`}>
                                    <ImportPaletteIcon />
                                    <input
                                        id="palette-file-input"
                                        type="file"
                                        accept="image/png"
                                        className="hidden"
                                        disabled={isImportingPalette}
                                        onChange={handlePaletteFileChange}
                                    />
                                </label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {paintPalette.map(({ name, color }) => (
                                    <button
                                        key={`${name}-${color.getHexString()}`}
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

                    {paintMode === 'texture' && (
                         <div className="flex flex-col items-center space-y-3">
                            {paintTexture && (
                                <img src={paintTexture.src} alt="Current paint texture" className="w-full h-auto rounded-md border-2 border-gray-600" />
                            )}
                            <label htmlFor="texture-file-input" className="w-full flex items-center justify-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors cursor-pointer">
                                <ImportTextureIcon />
                                <span className="ml-2">{isImportingTexture ? 'Importing...' : 'Import Texture'}</span>
                                <input
                                    id="texture-file-input"
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    className="hidden"
                                    disabled={isImportingTexture}
                                    onChange={handleTextureFileChange}
                                />
                            </label>

                            <div className="w-full pt-2 mt-2 border-t border-gray-700 space-y-4">
                                <div>
                                    <label htmlFor="texture-scale" className="flex justify-between text-sm text-gray-300 mb-1">
                                        <span>Scale</span>
                                        <span>{textureSettings.scale.toFixed(2)}</span>
                                    </label>
                                    <input id="texture-scale" type="range" min="0.1" max="10" step="0.1" value={textureSettings.scale}
                                        onChange={(e) => onSetTextureSettings({ ...textureSettings, scale: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="texture-rotation" className="flex justify-between text-sm text-gray-300 mb-1">
                                        <span>Rotation</span>
                                        <span>{textureSettings.rotation.toFixed(0)}°</span>
                                    </label>
                                    <input id="texture-rotation" type="range" min="0" max="360" step="1" value={textureSettings.rotation}
                                        onChange={(e) => onSetTextureSettings({ ...textureSettings, rotation: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="texture-blend-weight" className="flex justify-between text-sm text-gray-300 mb-1">
                                        <span>Blend Weight</span>
                                        <span>{textureSettings.blendWeight.toFixed(2)}</span>
                                    </label>
                                    <input id="texture-blend-weight" type="range" min="0" max="1" step="0.05" value={textureSettings.blendWeight}
                                        onChange={(e) => onSetTextureSettings({ ...textureSettings, blendWeight: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            </div>
                        </div>
                    )}
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

            <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Simulation</h2>
                <div className="flex flex-col space-y-2">
                     <button onClick={onErosion} className="w-full flex items-center justify-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                        <ErosionIcon />
                        <span className="ml-2">Erosion</span>
                    </button>
                    <button onClick={onGlobalFlatten} className="w-full flex items-center justify-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                        <FlattenIcon />
                        <span className="ml-2">Flatten All</span>
                    </button>
                </div>
            </div>
            
            <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Export</h2>
                <div className="flex flex-col space-y-2">
                     <button onClick={() => onExport('glb')} className="w-full flex items-center justify-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                        <ExportIcon />
                        <span className="ml-2">Export GLB</span>
                    </button>
                    <button onClick={() => onExport('gltf')} className="w-full flex items-center justify-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                        <ExportIcon />
                        <span className="ml-2">Export GLTF</span>
                    </button>
                    <button onClick={() => onExport('obj')} className="w-full flex items-center justify-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                        <ExportIcon />
                        <span className="ml-2">Export OBJ</span>
                    </button>
                </div>
            </div>

        </aside>
    );
};
