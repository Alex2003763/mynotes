import React, { useEffect } from 'react';
import { usePerformanceMonitoring, useMemoryMonitoring } from '../utils/performance';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

/**
 * Performance monitoring component that tracks key metrics
 * Only active in development mode
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  usePerformanceMonitoring();
  useMemoryMonitoring();

  useEffect(() => {
    if (!enabled) return;

    // Track component mount performance
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      console.log(`PerformanceMonitor lifecycle: ${(endTime - startTime).toFixed(2)}ms`);
    };
  }, [enabled]);

  // This component doesn't render anything visible
  return null;
};

export default PerformanceMonitor;