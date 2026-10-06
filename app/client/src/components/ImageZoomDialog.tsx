import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@databricks/appkit-ui/react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';

const MIN = 1;
const MAX = 6;

interface Props {
  src: string;
  alt: string;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full-size gauge photo with wheel / button zoom and drag-to-pan, so reviewers can check the needle and scale. */
export function ImageZoomDialog({ src, alt, title, description, open, onOpenChange }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoom = (next: number) => {
    const s = Math.min(MAX, Math.max(MIN, next));
    setScale(s);
    if (s === 1) setOffset({ x: 0, y: 0 });
  };
  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div
          className={`relative h-[70vh] overflow-hidden rounded-md border bg-muted/40 select-none ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
          onWheel={(e) => zoom(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
          onDoubleClick={() => (scale > 1 ? reset() : zoom(2.5))}
          onMouseDown={(e) => {
            if (scale > 1) drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onMouseMove={(e) => {
            const d = drag.current;
            if (d) setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
          }}
          onMouseUp={() => (drag.current = null)}
          onMouseLeave={() => (drag.current = null)}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain transition-transform duration-75"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Scroll or use the buttons to zoom · drag to pan · double-click to toggle
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => zoom(scale / 1.5)}
              disabled={scale <= MIN}
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-sm tabular-nums">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => zoom(scale * 1.5)}
              disabled={scale >= MAX}
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
