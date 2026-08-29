import { VennCanvas } from "@/components/canvas/VennCanvas";

import { EditorHeader } from "@/components/editor/EditorHeader";

import { FormulaBar } from "@/components/editor/FormulaBar";

import { SetsPanel } from "@/components/editor/SetsPanel";

function App() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-surface">
      <EditorHeader />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[19rem_minmax(0,1fr)]">
        <SetsPanel />

        <section className="flex min-h-0 flex-col gap-4 overflow-hidden bg-surface p-6">
          <FormulaBar />

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <VennCanvas />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
