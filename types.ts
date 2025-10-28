
export enum Tool {
  Raise = 'Raise',
  Lower = 'Lower',
  Flatten = 'Flatten',
  Smooth = 'Smooth',
}

export interface BrushSettings {
  size: number;
  strength: number;
}
