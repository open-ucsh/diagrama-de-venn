import { VennCanvas } from "@/components/canvas/VennCanvas";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { SelectionInspector } from "@/components/editor/SelectionInspector";

function App() {
  return (
    <main className="min-h-dvh bg-surface">
      <EditorHeader />

      <div className="mx-auto grid min-h-screen max-w-screen-2xl grid-cols-1 lg:grid-cols-4">
        <section className="flex min-h-144 items-center justify-center bg-white p-6 lg:col-span-3">
          <VennCanvas />
        </section>

        <SelectionInspector />
      </div>
    </main>
  );
}

export default App;
