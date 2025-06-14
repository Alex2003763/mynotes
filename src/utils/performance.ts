// Performance optimization utilities for MyNotes application

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Debounce hook for search and other frequent operations
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Debounced callback hook
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @param deps - Dependencies array
 * @returns debounced callback
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, delay, ...deps]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Memoized search filter for notes
 * @param notes - Array of notes
 * @param searchQuery - Search query string
 * @param filterTags - Array of tags to filter by
 * @returns filtered notes array
 */
export const useFilteredNotes = (
  notes: any[],
  searchQuery: string,
  filterTags: string[]
) => {
  return useMemo(() => {
    let filtered = notes;

    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filtered.filter(note =>
        filterTags.every(tag => note.tags.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(lowerQuery);
        const contentMatch = note.content?.toLowerCase().includes(lowerQuery);
        return titleMatch || contentMatch;
      });
    }

    return filtered;
  }, [notes, searchQuery, filterTags]);
};

/**
 * Performance monitoring hook for Core Web Vitals
 */
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navigationEntry = entry as PerformanceNavigationTiming;
          console.log('Page Load Performance:', {
            domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
            loadComplete: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
            firstByte: navigationEntry.responseStart - navigationEntry.requestStart
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, []);
};

/**
 * Virtual scrolling hook for large lists
 * @param items - Array of items to virtualize
 * @param itemHeight - Height of each item in pixels
 * @param containerHeight - Height of the scrollable container
 * @returns object with visible items and scroll handlers
 */
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = useMemo(() => {
    return items.slice(visibleStart, visibleEnd).map((item, index) => ({
      item,
      index: visibleStart + index,
      offsetY: (visibleStart + index) * itemHeight
    }));
  }, [items, visibleStart, visibleEnd, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    visibleStart,
    visibleEnd
  };
};

/**
 * Intersection Observer hook for lazy loading
 * @param threshold - Intersection threshold (0-1)
 * @returns ref and isIntersecting boolean
 */
export const useIntersectionObserver = (threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return { ref, isIntersecting };
};

/**
 * Memoization helper for expensive calculations
 * @param fn - Function to memoize
 * @param deps - Dependencies array
 * @returns memoized result
 */
export const useMemoizedValue = <T>(fn: () => T, deps: React.DependencyList): T => {
  return useMemo(fn, deps);
};

/**
 * Hook to measure and log component render performance
 * @param componentName - Name of the component for logging
 */
export const useRenderPerformance = (componentName: string) => {
  const renderStart = useRef<number | undefined>(undefined);
  const renderCount = useRef(0);

  useEffect(() => {
    renderStart.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) { // Log slow renders (>16ms)
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
      }
    }
  });
};

/**
 * Memory usage monitoring hook
 */
export const useMemoryMonitoring = () => {
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected:', {
            used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
          });
        }
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
};