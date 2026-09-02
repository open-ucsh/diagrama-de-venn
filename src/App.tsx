import { CanvasViewport } from "@/components/canvas/CanvasViewport";

import { EditorHeader } from "@/components/editor/EditorHeader";

import { FormulaBar } from "@/components/editor/FormulaBar";

import { SetsPanel } from "@/components/editor/SetsPanel";

function App() {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-surface lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <EditorHeader />

      <div className="flex min-w-0 flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[19rem_minmax(0,1fr)] lg:overflow-hidden">
        <SetsPanel />

        <section className="flex min-w-0 flex-col gap-4 p-4 sm:p-6 lg:min-h-0 lg:overflow-hidden">
          <FormulaBar />

          <div className="flex min-h-96 min-w-0 flex-1 overflow-hidden">
            <CanvasViewport />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
