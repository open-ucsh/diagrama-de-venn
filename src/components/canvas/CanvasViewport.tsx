import { VennCanvas } from "./VennCanvas";

export function CanvasViewport() {
  return (
    <section
      aria-label="Área del diagrama"
      className="relative h-full min-h-0 min-w-0 overflow-hidden"
    >
      <div className="venn-canvas-fit flex h-full w-full items-center justify-center overflow-hidden">
        <VennCanvas />
      </div>
    </section>
  );
}
