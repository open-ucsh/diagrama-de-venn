import { VennCanvas } from "./VennCanvas";

export function CanvasViewport() {
  return (
    <section aria-label="Área del diagrama" className="venn-canvas-viewport">
      <div className="venn-canvas-fit">
        <VennCanvas />
      </div>
    </section>
  );
}
