'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useTranslation } from '@/lib/useTranslation';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  isLoading?: boolean;
}

interface VisibleRange {
  start: number;
  end: number;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  onScroll,
  className = '',
  emptyMessage = 'No items to display',
  loadingComponent,
  isLoading = false,
}: VirtualListProps<T>) {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({ start: 0, end: 0 });
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate item positions
  const getItemHeight = useCallback(
    (index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  const getItemOffset = useCallback(
    (index: number): number => {
      if (typeof itemHeight === 'number') {
        return index * itemHeight;
      }
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [itemHeight, getItemHeight]
  );

  const getTotalHeight = useCallback((): number => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getItemHeight]);

  // Calculate visible range
  const calculateVisibleRange = useCallback(
    (scrollTop: number): VisibleRange => {
      const containerHeight = height;
      let start = 0;
      let accumulatedHeight = 0;

      // Find start index
      for (let i = 0; i < items.length; i++) {
        const itemHeight = getItemHeight(i);
        if (accumulatedHeight + itemHeight > scrollTop) {
          start = Math.max(0, i - overscan);
          break;
        }
        accumulatedHeight += itemHeight;
      }

      // Find end index
      let end = start;
      accumulatedHeight = getItemOffset(start);
      for (let i = start; i < items.length; i++) {
        if (accumulatedHeight > scrollTop + containerHeight) {
          end = Math.min(items.length - 1, i + overscan);
          break;
        }
        accumulatedHeight += getItemHeight(i);
        end = i;
      }

      return { start, end: Math.min(end, items.length - 1) };
    },
    [items.length, height, overscan, getItemHeight, getItemOffset]
  );

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);

      const newRange = calculateVisibleRange(newScrollTop);
      setVisibleRange(newRange);
    },
    [calculateVisibleRange, onScroll]
  );

  // Update visible range when items change
  useEffect(() => {
    const newRange = calculateVisibleRange(scrollTop);
    setVisibleRange(newRange);
  }, [items, calculateVisibleRange, scrollTop]);

  // Render visible items
  const visibleItems = [];
  for (let i = visibleRange.start; i <= visibleRange.end; i++) {
    const item = items[i];
    if (item !== undefined) {
      visibleItems.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top: getItemOffset(i),
            left: 0,
            right: 0,
            height: getItemHeight(i),
          }}
        >
          {renderItem(item, i)}
        </div>
      );
    }
  }

  if (isLoading && loadingComponent) {
    return <div className={className}>{loadingComponent}</div>;
  }

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-neutral-gray">{t(emptyMessage, { defaultValue: emptyMessage })}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
      role="list"
      aria-label={t('virtualList.label', { defaultValue: 'Scrollable list' })}
      tabIndex={0}
    >
      <div
        ref={scrollElementRef}
        style={{
          height: getTotalHeight(),
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

// Memoized item wrapper for performance
export const VirtualListItem = memo(function VirtualListItem<T>({
  item,
  index,
  renderItem,
}: {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  return <>{renderItem(item, index)}</>;
});

// Hook for virtual scrolling logic
export function useVirtualScroll<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number | ((index: number) => number),
  overscan = 3
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({ start: 0, end: 0 });

  const getItemHeight = useCallback(
    (index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  const calculateVisibleRange = useCallback(
    (scrollTop: number): VisibleRange => {
      let start = 0;
      let accumulatedHeight = 0;

      // Find start index
      if (typeof itemHeight === 'number') {
        start = Math.floor(scrollTop / itemHeight);
      } else {
        for (let i = 0; i < items.length; i++) {
          const height = getItemHeight(i);
          if (accumulatedHeight + height > scrollTop) {
            start = i;
            break;
          }
          accumulatedHeight += height;
        }
      }

      // Apply overscan
      start = Math.max(0, start - overscan);

      // Find end index
      let end = start;
      accumulatedHeight = 0;
      for (let i = start; i < items.length; i++) {
        if (accumulatedHeight > containerHeight) {
          end = i;
          break;
        }
        accumulatedHeight += getItemHeight(i);
      }

      end = Math.min(items.length - 1, end + overscan);

      return { start, end };
    },
    [items.length, containerHeight, overscan, itemHeight, getItemHeight]
  );

  useEffect(() => {
    const newRange = calculateVisibleRange(scrollTop);
    setVisibleRange(newRange);
  }, [scrollTop, calculateVisibleRange]);

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  return {
    visibleRange,
    scrollTop,
    handleScroll,
  };
}