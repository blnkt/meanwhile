import type { TimelineBlock } from './types';

export type CardBounds = { bottom: number; top: number };

type GradientTuple = [number, number, ...number[]];
export type ColorTuple = [string, string, ...string[]];
export type GradientPresetKey = 'default' | 'calm' | 'forest' | 'mono';
export type GradientSpec = {
  colors: ColorTuple;
  locations: GradientTuple;
};

const GRADIENT_PRESET_COLORS: Record<GradientPresetKey, { dark: ColorTuple; light: ColorTuple }> = {
  default: {
    dark: ['#0b1324', '#4a3320'],
    light: ['#d8e8ff', '#ffd8bd'],
  },
  calm: {
    dark: ['#11213a', '#2c3f66'],
    light: ['#dceeff', '#c8defc'],
  },
  forest: {
    dark: ['#0f251d', '#2f3b20'],
    light: ['#d7f3df', '#e7f0cf'],
  },
  mono: {
    dark: ['#151515', '#3a3a3a'],
    light: ['#f5f5f5', '#e6e6e6'],
  },
};

function hexToRgb(hex: string): { b: number; g: number; r: number } {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value.split('').map(char => char + char).join('');
  }
  const parsed = Number.parseInt(value, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function blendHex(from: string, to: string, t: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const clamped = Math.min(1, Math.max(0, t));
  return rgbToHex(
    start.r + (end.r - start.r) * clamped,
    start.g + (end.g - start.g) * clamped,
    start.b + (end.b - start.b) * clamped,
  );
}

export function getParentGradientColors(scheme: 'light' | 'dark'): ColorTuple {
  return getParentGradientColorsForPreset(scheme, 'default');
}

export function getParentGradientColorsForPreset(
  scheme: 'light' | 'dark',
  preset: GradientPresetKey,
): ColorTuple {
  return GRADIENT_PRESET_COLORS[preset][scheme];
}

export function buildDurationWeightedGradientSpec(input: {
  blocks: TimelineBlock[];
  cardBoundsById: Record<string, CardBounds>;
  gradientHeight: number;
  parentGradientColors: ColorTuple;
}): GradientSpec | undefined {
  const {
    blocks,
    cardBoundsById,
    gradientHeight,
    parentGradientColors,
  } = input;
  if (gradientHeight <= 0 || blocks.length === 0) {
    return undefined;
  }

  const durations = blocks.map((block) => {
    const start = new Date(block.startTime).getTime();
    const end = new Date(block.endTime).getTime();
    return Math.max(1, end - start);
  });
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  if (totalDuration <= 0) {
    return undefined;
  }

  const points: Array<{ location: number; progress: number }> = [{ location: 0, progress: 0 }, { location: 1, progress: 1 }];
  let elapsedDuration = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const bounds = cardBoundsById[block.entryId];
    const duration = durations[index];
    if (!bounds) {
      elapsedDuration += duration;
      continue;
    }

    const topProgress = elapsedDuration / totalDuration;
    elapsedDuration += duration;
    const bottomProgress = elapsedDuration / totalDuration;
    points.push(
      { location: bounds.top / gradientHeight, progress: topProgress },
      { location: bounds.bottom / gradientHeight, progress: bottomProgress },
    );
  }

  const sorted = points
    .map(point => ({
      location: Math.min(1, Math.max(0, point.location)),
      progress: Math.min(1, Math.max(0, point.progress)),
    }))
    .sort((a, b) => a.location - b.location);

  const deduped: Array<{ location: number; progress: number }> = [];
  for (const point of sorted) {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.location - point.location) <= 0.0001) {
      previous.progress = Math.max(previous.progress, point.progress);
      continue;
    }
    deduped.push({ ...point });
  }

  for (let index = 1; index < deduped.length; index += 1) {
    deduped[index].progress = Math.max(deduped[index - 1].progress, deduped[index].progress);
  }

  const [from, to] = parentGradientColors;
  const locations = deduped.map(point => point.location);
  const colors = deduped.map(point => blendHex(from, to, point.progress));
  if (locations.length < 2 || colors.length < 2) {
    return undefined;
  }
  return {
    locations: locations as GradientTuple,
    colors: colors as ColorTuple,
  };
}
