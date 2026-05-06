import type { TimelineBlock } from './types';

import {
  buildDurationWeightedGradientSpec,
  getParentGradientColors,
} from './journal-day-gradient';

function block(partial: Partial<TimelineBlock> & Pick<TimelineBlock, 'entryId' | 'startTime' | 'endTime'>): TimelineBlock {
  return {
    moodEmoji: partial.moodEmoji ?? null,
    text: partial.text ?? '',
    ...partial,
  };
}

describe('journal-day-gradient', () => {
  describe('getParentGradientColors', () => {
    it('returns distinct light and dark palettes', () => {
      expect(getParentGradientColors('light')).toEqual(['#d8e8ff', '#ffd8bd']);
      expect(getParentGradientColors('dark')).toEqual(['#0b1324', '#4a3320']);
    });
  });

  describe('buildDurationWeightedGradientSpec', () => {
    const parent = getParentGradientColors('light');

    it('returns undefined when height is zero or there are no blocks', () => {
      expect(
        buildDurationWeightedGradientSpec({
          blocks: [block({ entryId: 'a', startTime: '2026-04-29T09:00:00.000Z', endTime: '2026-04-29T10:00:00.000Z' })],
          cardBoundsById: { a: { top: 0, bottom: 50 } },
          gradientHeight: 0,
          parentGradientColors: parent,
        }),
      ).toBeUndefined();

      expect(
        buildDurationWeightedGradientSpec({
          blocks: [],
          cardBoundsById: {},
          gradientHeight: 400,
          parentGradientColors: parent,
        }),
      ).toBeUndefined();
    });

    it('returns monotonic locations and matching color count for measured cards', () => {
      const blocks = [
        block({ entryId: 'a', startTime: '2026-04-29T09:00:00.000Z', endTime: '2026-04-29T10:00:00.000Z' }),
        block({ entryId: 'b', startTime: '2026-04-29T10:00:00.000Z', endTime: '2026-04-29T10:00:00.000Z' }),
      ];
      const spec = buildDurationWeightedGradientSpec({
        blocks,
        cardBoundsById: {
          a: { top: 0, bottom: 100 },
          b: { top: 120, bottom: 200 },
        },
        gradientHeight: 400,
        parentGradientColors: parent,
      });

      expect(spec).toBeDefined();
      expect(spec!.locations.length).toBe(spec!.colors.length);
      expect(spec!.locations.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < spec!.locations.length; i += 1) {
        expect(spec!.locations[i]).toBeGreaterThanOrEqual(spec!.locations[i - 1]);
      }
      for (const color of spec!.colors) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('uses a minimum duration when start and end are equal so weighting stays stable', () => {
      const blocks = [
        block({ entryId: 'only', startTime: '2026-04-29T12:00:00.000Z', endTime: '2026-04-29T12:00:00.000Z' }),
      ];
      const spec = buildDurationWeightedGradientSpec({
        blocks,
        cardBoundsById: { only: { top: 0, bottom: 80 } },
        gradientHeight: 200,
        parentGradientColors: parent,
      });
      expect(spec).toBeDefined();
      expect(spec!.locations[0]).toBe(0);
      expect(spec!.locations[spec!.locations.length - 1]).toBe(1);
    });
  });
});
