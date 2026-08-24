import { VennCanvas } from "@/components/canvas/VennCanvas";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { SelectionInspector } from "@/components/editor/SelectionInspector";
import { SetsPanel } from "@/components/editor/SetsPanel";

function App() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-surface">
      <EditorHeader />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
        <SetsPanel />

        <section className="flex min-h-0 items-center justify-center overflow-hidden bg-surface p-6 lg:col-span-6">
          <VennCanvas />
        </section>

        <SelectionInspector />
      </div>
    </main>
  );
}

export default App;
