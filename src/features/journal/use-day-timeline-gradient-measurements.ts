import type { LayoutChangeEvent, View } from 'react-native';

import type { CardBounds } from '@/features/journal/journal-day-gradient';
import type { TimelineBlock } from '@/features/journal/types';
import * as React from 'react';

function measureInWindowPromise(node: View | null): Promise<{ height: number; width: number; x: number; y: number } | null> {
  if (!node) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    node.measureInWindow(
      // eslint-disable-next-line max-params -- React Native measureInWindow callback arity
      (x, y, width, height) => {
        resolve({ x, y, width, height });
      },
    );
  });
}

export function useDayTimelineGradientMeasurements(
  blocks: TimelineBlock[],
  gradientBackdropRef: React.RefObject<View | null>,
) {
  const cardRefs = React.useRef<Record<string, View | null>>({});
  const [gradientHeight, setGradientHeight] = React.useState(0);
  const [cardBoundsById, setCardBoundsById] = React.useState<Record<string, CardBounds>>({});
  const rafId = React.useRef<number | null>(null);

  const syncCardBoundsToGradient = React.useCallback(async () => {
    const gNode = gradientBackdropRef.current;
    if (!gNode || gradientHeight <= 0) {
      return;
    }
    const gRect = await measureInWindowPromise(gNode);
    if (!gRect) {
      return;
    }

    const next: Record<string, CardBounds> = {};
    await Promise.all(
      blocks.map(async (block) => {
        const cNode = cardRefs.current[block.entryId];
        const cRect = await measureInWindowPromise(cNode);
        if (!cRect) {
          return;
        }
        next[block.entryId] = {
          top: cRect.y - gRect.y,
          bottom: cRect.y + cRect.height - gRect.y,
        };
      }),
    );

    setCardBoundsById((previous) => {
      if (Object.keys(next).length === 0) {
        return previous;
      }
      let changed = false;
      for (const id of Object.keys(next)) {
        const prevB = previous[id];
        const nextB = next[id];
        if (
          !prevB
          || Math.abs(prevB.top - nextB.top) >= 0.5
          || Math.abs(prevB.bottom - nextB.bottom) >= 0.5
        ) {
          changed = true;
          break;
        }
      }
      return changed ? { ...previous, ...next } : previous;
    });
  }, [blocks, gradientBackdropRef, gradientHeight]);

  const scheduleSyncCardBounds = React.useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
    }
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      void syncCardBoundsToGradient();
    });
  }, [syncCardBoundsToGradient]);

  React.useEffect(() => {
    return () => {
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  React.useEffect(() => {
    scheduleSyncCardBounds();
  }, [blocks, gradientHeight, scheduleSyncCardBounds]);

  const handleMeasureGradient = React.useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setGradientHeight(previous => (Math.abs(previous - nextHeight) < 0.5 ? previous : nextHeight));
  }, []);

  const setCardRef = React.useCallback((entryId: string, node: View | null) => {
    if (node) {
      cardRefs.current[entryId] = node;
    }
    else {
      delete cardRefs.current[entryId];
    }
  }, []);

  const onScroll = React.useCallback(() => {
    scheduleSyncCardBounds();
  }, [scheduleSyncCardBounds]);

  return {
    gradientHeight,
    cardBoundsById,
    handleMeasureGradient,
    setCardRef,
    onScroll,
  };
}
