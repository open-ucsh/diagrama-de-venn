import { FileText } from "lucide-react";

import { useVennStore } from "@/state/venn-store";

export function EditorHeader() {
  const diagramName = useVennStore((state) => state.diagram.metadata.name);

  return (
    <header className="border-b-4 border-accent bg-brand-primary px-5 py-4 text-white sm:px-8">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-5">
        <img
          alt="Universidad Católica Silva Henríquez"
          className="h-12 w-auto object-contain"
          src="/logo.png"
        />

        <div className="h-10 w-px bg-white/20" />

        <div className="flex items-center gap-3">
          <FileText className="size-5 text-white/80" />

          <div>
            <p className="text-base font-bold tracking-tight sm:text-lg">Diagrama de Venn</p>
            <p className="mt-0.5 text-sm text-white/70">{diagramName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
