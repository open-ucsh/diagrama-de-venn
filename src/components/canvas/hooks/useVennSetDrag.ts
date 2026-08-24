import { useRef, type PointerEvent } from "react";

import type { Point, VennSet } from "@/domain/venn/models";

interface DragState {
  offset: Point;
  setId: string;
}

function getSvgPoint(svg: SVGSVGElement, event: PointerEvent<SVGSVGElement | SVGGElement>): Point {
  const bounds = svg.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 900,
    y: ((event.clientY - bounds.top) / bounds.height) * 600,
  };
}

export function useVennSetDrag(onMoveSet: (setId: string, position: Point) => void) {
  const dragStateRef = useRef<DragState | null>(null);

  function onSetPointerDown(event: PointerEvent<SVGGElement>, set: VennSet) {
    const svg = event.currentTarget.ownerSVGElement;

    if (!svg) {
      return;
    }

    event.preventDefault();

    const pointer = getSvgPoint(svg, event);

    dragStateRef.current = {
      offset: {
        x: pointer.x - set.position.x,
        y: pointer.y - set.position.y,
      },
      setId: set.id,
    };

    svg.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: PointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const pointer = getSvgPoint(event.currentTarget, event);

    onMoveSet(dragState.setId, {
      x: pointer.x - dragState.offset.x,
      y: pointer.y - dragState.offset.y,
    });
  }

  function onCanvasPointerUp(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
  }

  return {
    onCanvasPointerMove,
    onCanvasPointerUp,
    onSetPointerDown,
  };
}
