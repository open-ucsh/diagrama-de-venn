import { useRef, useState } from "react";

import { Minus, Plus, RotateCcw } from "lucide-react";

import { VennCanvas } from "./VennCanvas";

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
}

export function CanvasViewport() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(MIN_ZOOM);

  function updateZoom(nextZoom: number) {
    const container = scrollContainerRef.current;

    const normalizedX =
      container && container.scrollWidth > 0
        ? (container.scrollLeft + container.clientWidth / 2) / container.scrollWidth
        : 0.5;

    const normalizedY =
      container && container.scrollHeight > 0
        ? (container.scrollTop + container.clientHeight / 2) / container.scrollHeight
        : 0.5;

    const resolvedZoom = clampZoom(nextZoom);

    setZoom(resolvedZoom);

    window.requestAnimationFrame(() => {
      const currentContainer = scrollContainerRef.current;

      if (!currentContainer) {
        return;
      }

      currentContainer.scrollLeft =
        normalizedX * currentContainer.scrollWidth - currentContainer.clientWidth / 2;

      currentContainer.scrollTop =
        normalizedY * currentContainer.scrollHeight - currentContainer.clientHeight / 2;
    });
  }

  function resetZoom() {
    setZoom(MIN_ZOOM);

    window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;

      if (!container) {
        return;
      }

      container.scrollTo({
        left: 0,
        top: 0,
        behavior: "smooth",
      });
    });
  }

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <section
      aria-label="Área del diagrama"
      className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl"
    >
      <div
        className="absolute top-3 right-3 z-20 flex items-center overflow-hidden rounded-lg border border-border bg-white shadow-sm lg:hidden"
        role="group"
        aria-label="Controles de zoom"
      >
        <button
          aria-label="Reducir diagrama"
          className="grid size-10 place-items-center text-text-muted transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => {
            updateZoom(zoom - ZOOM_STEP);
          }}
          title="Reducir"
          type="button"
        >
          <Minus aria-hidden="true" className="size-4" />
        </button>

        <button
          aria-label="Restablecer zoom"
          className="min-w-14 border-x border-border px-2 py-2.5 font-mono text-xs font-bold text-text-muted transition-colors hover:bg-surface hover:text-text"
          onClick={resetZoom}
          title="Restablecer zoom"
          type="button"
        >
          {zoomPercentage}%
        </button>

        <button
          aria-label="Ampliar diagrama"
          className="grid size-10 place-items-center text-text-muted transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => {
            updateZoom(zoom + ZOOM_STEP);
          }}
          title="Ampliar"
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>

      {zoom > MIN_ZOOM && (
        <button
          aria-label="Restablecer tamaño del diagrama"
          className="absolute right-3 bottom-3 z-20 grid size-10 place-items-center rounded-lg border border-border bg-white text-text-muted shadow-sm transition-colors hover:bg-surface hover:text-text lg:hidden"
          onClick={resetZoom}
          title="Restablecer vista"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      )}

      <div className="h-full w-full overflow-auto overscroll-contain" ref={scrollContainerRef}>
        <div
          className="flex min-h-full min-w-full items-center justify-center"
          style={{
            width: `${zoom * 100}%`,
          }}
        >
          <VennCanvas />
        </div>
      </div>

      <span aria-live="polite" className="sr-only">
        Zoom del diagrama: {zoomPercentage} por ciento
      </span>
    </section>
  );
}
