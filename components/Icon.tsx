
import React from 'react';

const iconProps = {
    className: "w-6 h-6",
    strokeWidth: 1.5,
    stroke: "currentColor",
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
};

export const RaiseIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M12 5l-6 6h4v6h4v-6h4l-6-6z" />
        <path d="M4 17h16" />
    </svg>
);

export const LowerIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M12 19l6-6h-4V7h-4v6H6l6 6z" />
        <path d="M4 17h16" />
    </svg>
);

export const FlattenIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M3 8h18M3 16h18M9 3v18M15 3v18" />
    </svg>
);

export const SmoothIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M4 8c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4H8c-2.21 0-4-1.79-4-4V8z" />
        <path d="M7 12c.5-1.5 2-2 4-2s3.5.5 4 2c.5 1.5-2 2-4 2s-3.5-.5-4-2z" stroke="currentColor" fill="currentColor" />
    </svg>
);

export const PaintIcon = () => (
     <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zM20.71 4.63l-1.34-1.34c-.39-.39-1.02-.39-1.41 0l-1.34 1.34-6.62 6.62-1.41 4.24 4.24-1.41 8.04-8.05c.39-.39.39-1.02 0-1.41z"></path>
    </svg>
);

export const PlaneIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M3,19 L21,19" />
        <path d="M5,15 L19,15" />
        <path d="M5,15 L3,19" />
        <path d="M19,15 L21,19" />
    </svg>
);


export const UndoIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M10 19H5a2 2 0 01-2-2V7a2 2 0 012-2h5" />
        <path d="M8 1l-4 4 4 4" />
    </svg>
);

export const RedoIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M14 5h5a2 2 0 012 2v10a2 2 0 01-2 2h-5" />
        <path d="M16 19l4-4-4-4" />
    </svg>
);

export const ExportIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

export const ErosionIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M5 20h14L12 4z" />
        <path d="M12 8c-2 2-2 4 0 6s2 2 0 4" />
    </svg>
);

export const ImportPaletteIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M17.25 9c0 2.899-2.351 5.25-5.25 5.25S6.75 11.899 6.75 9s2.351-5.25 5.25-5.25S17.25 6.101 17.25 9z" />
        <path d="M12 14.25c-3.536 0-6.536 2.007-7.962 4.938A8.956 8.956 0 0012 21a8.956 8.956 0 007.962-1.812C18.536 16.257 15.536 14.25 12 14.25z" />
        <path d="M19 12h2v2h-2v-2z" />
        <path d="M19 8h2v2h-2V8z" />
        <path d="M19 16h2v2h-2v-2z" />
        <path d="M3 12h2v2H3v-2z" />
        <path d="M3 8h2v2H3V8z" />
        <path d="M3 16h2v2H3v-2z" />
    </svg>
);

export const ImportTextureIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);