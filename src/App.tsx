import { useEffect, useRef } from "react";

import { CanvasViewport } from "@/components/canvas/CanvasViewport";

import { EditorHeader } from "@/components/editor/EditorHeader";

import { FormulaBar } from "@/components/editor/FormulaBar";

import { SetsPanel } from "@/components/editor/SetsPanel";

import { consumeSharedProject } from "@/domain/venn/share-project";

import { useVennStore } from "@/state/venn-store";

function App() {
  const sharedProjectLoaded = useRef(false);

  const importProject = useVennStore((state) => state.importProject);

  useEffect(() => {
    if (sharedProjectLoaded.current) {
      return;
    }

    sharedProjectLoaded.current = true;

    try {
      const sharedProject = consumeSharedProject();

      if (!sharedProject) {
        return;
      }

      importProject(sharedProject.diagram, sharedProject.selectedRegionIds);
    } catch (error) {
      console.error("No fue posible abrir el diagrama compartido.", error);
    }
  }, [importProject]);

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-surface lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <EditorHeader />

      <div className="flex min-w-0 flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[19rem_minmax(0,1fr)] lg:overflow-hidden">
        <SetsPanel />

        <section className="flex min-w-0 flex-col gap-4 p-4 sm:p-6 lg:min-h-0 lg:overflow-hidden">
          <FormulaBar />

          <div className="flex h-112 min-w-0 flex-1 overflow-hidden sm:h-136 lg:h-auto lg:min-h-0">
            <CanvasViewport />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
