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
    if (sharedProjectLoaded.current) return;

    sharedProjectLoaded.current = true;

    try {
      const sharedProject = consumeSharedProject();

      if (!sharedProject) return;

      importProject(sharedProject.diagram, sharedProject.selectedRegionIds);
    } catch (error) {
      console.error("No fue posible abrir el diagrama compartido.", error);
    }
  }, [importProject]);

  return (
    <main className="venn-workspace">
      <EditorHeader />

      <div className="venn-workspace__body">
        <div className="venn-workspace__canvas">
          <CanvasViewport />
        </div>

        <div className="venn-workspace__sets">
          <SetsPanel />
        </div>

        <div className="venn-workspace__formula">
          <FormulaBar />
        </div>
      </div>
    </main>
  );
}

export default App;
