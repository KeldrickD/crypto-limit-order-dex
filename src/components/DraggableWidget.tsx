'use client';

import { useState, useRef, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WidgetBase {
  id: string;
  type: 'predictive-analytics' | 'order-book' | 'trade-history' | 'market-depth' | 'alerts' | 'volume-analysis' | 'trading-pairs' | 'portfolio-overview' | 'news';
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  resizable: boolean;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  settings: {
    tokenPair?: string;
    timeframe?: string;
    metric?: string;
    refreshInterval?: number;
    chartType?: string;
    indicators?: string[];
    theme?: 'light' | 'dark' | 'system';
    alertThresholds?: {
      upper?: number;
      lower?: number;
    };
    [key: string]: unknown;
  };
}

interface DraggableWidgetProps {
  widget: WidgetBase;
  children: ReactNode;
  onToggle: (id: string) => void;
  onResize: (size: { w: number; h: number }) => void;
  isDragging: boolean;
}

export default function DraggableWidget({
  widget,
  children,
  onToggle,
  onResize,
  isDragging
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef<{ x: number; y: number } | null>(null);
  const originalSize = useRef<{ w: number; h: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!widget.resizable) return;
    
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    originalSize.current = { w: widget.position.w, h: widget.position.h };

    const handleResizeMove = (e: MouseEvent) => {
      if (!resizeStartPos.current || !originalSize.current) return;

      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      const gridSize = 100; // Approximate size of one grid unit in pixels
      const newW = Math.max(
        widget.minW || 1,
        Math.min(
          originalSize.current.w + Math.round(deltaX / gridSize),
          widget.maxW || 4
        )
      );
      const newH = Math.max(
        widget.minH || 1,
        Math.min(
          originalSize.current.h + Math.round(deltaY / gridSize),
          widget.maxH || 4
        )
      );

      if (newW !== widget.position.w || newH !== widget.position.h) {
        onResize({ w: newW, h: newH });
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeStartPos.current = null;
      originalSize.current = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${widget.position.w}`,
    gridRow: `span ${widget.position.h}`,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow ${isResizing ? 'select-none' : ''}`}
      {...attributes}
    >
      <div
        className="absolute top-0 right-0 p-2 flex gap-2 z-10 bg-white dark:bg-gray-800 rounded-tr-lg"
        {...listeners}
      >
        <button
          onClick={() => onToggle(widget.id)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {widget.visible ? 'Hide' : 'Show'}
        </button>
        <button
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-move"
        >
          ⋮
        </button>
      </div>

      {children}

      {widget.resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 13l-7 7-7-7"
            />
          </svg>
        </div>
      )}
    </div>
  );
} 