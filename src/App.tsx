import { VennCanvas } from "@/components/canvas/VennCanvas";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { SelectionInspector } from "@/components/editor/SelectionInspector";

function App() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-surface">
      <EditorHeader />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-4">
        <section className="flex min-h-0 items-center justify-center overflow-hidden bg-white p-6 lg:col-span-3">
          <VennCanvas />
        </section>

        <SelectionInspector />
      </div>
    </main>
  );
}

export default App;
