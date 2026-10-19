import { useEffect, useRef } from "react";

import { CanvasViewport } from "@/components/canvas/CanvasViewport";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { StorageRecoveryNotice } from "@/components/editor/StorageRecoveryNotice";
import { FormulaBar } from "@/components/editor/formula/FormulaBar";
import { SetsPanel } from "@/components/editor/sets/SetsPanel";
import { consumeSharedProject } from "@/services/venn/share-project";
import { useStorageRecovery } from "@/state/venn-storage";
import { useVennStore } from "@/state/venn-store";

function App() {
  const sharedProjectHandled = useRef(false);
  const importProject = useVennStore((state) => state.importProject);
  const recoveryIssue = useStorageRecovery((state) => state.issue);

  useEffect(() => {
    if (sharedProjectHandled.current || recoveryIssue !== null) {
      return;
    }

    // Evita consumir el enlace nuevamente si React repite el efecto en StrictMode.
    sharedProjectHandled.current = true;

    try {
      const sharedProject = consumeSharedProject();

      if (!sharedProject) {
        return;
      }

      importProject(sharedProject.diagram, sharedProject.selectedRegionIds);
    } catch (error) {
      console.error("No fue posible abrir el diagrama compartido.", error);
    }
  }, [importProject, recoveryIssue]);

  return (
    <main className="venn-workspace">
      <EditorHeader />
      <StorageRecoveryNotice />

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
