import React, { useCallback, useRef, useEffect } from 'react';

interface ResizerProps {
  onResize: (deltaX: number) => void;
  className?: string;
}

export const Resizer: React.FC<ResizerProps> = ({ onResize, className }) => {
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || startXRef.current === null) return;
    
    // Throttle or requestAnimationFrame can be used here for performance on rapid mouse moves
    // For now, direct update.
    const deltaX = e.clientX - startXRef.current;
    onResize(deltaX);
    startXRef.current = e.clientX; 
  }, [onResize]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    startXRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default drag behavior or text selection
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none'; // Prevent text selection globally
    document.body.style.cursor = 'col-resize'; // Change cursor globally during resize
  }, [handleMouseMove, handleMouseUp]);
  
  // Cleanup listeners if component unmounts while dragging
  useEffect(() => {
    return () => {
        if (isDraggingRef.current) {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
    };
  }, [handleMouseMove, handleMouseUp]);


  return (
    <div
      className={`sidebar-resizer ${className || ''} hidden md:flex`} // Only flex on md and up
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      title="Resize sidebar" // Accessibility
    />
  );
};