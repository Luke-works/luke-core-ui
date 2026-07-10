import { useRef, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';

interface DragResizeHandleProps {
  onResize: (deltaY: number) => void;
}

export default function DragResizeHandle({ onResize }: DragResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onResize);
  callbackRef.current = onResize;
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = true;
      lastYRef.current = e.clientY;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const delta = e.clientY - lastYRef.current;
      lastYRef.current = e.clientY;
      callbackRef.current(delta);
    };

    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    el.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div
      ref={handleRef}
      className="flex items-center justify-center cursor-row-resize select-none border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
      style={{ height: 14 }}
      title="Drag to resize"
    >
      <GripHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
    </div>
  );
}
