import {
  Check,
  Clipboard,
  Download,
  FileCode2,
  FileJson,
  Image,
  Link2,
  type LucideIcon,
  MoreHorizontal,
  Redo2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { type ReactNode, useId } from "react";

import { useExportMenu } from "@/components/editor/use-export-menu";
import { useVennStore } from "@/state/venn-store";

interface ExportActionProps {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  copied?: boolean;
  suffix?: string;
}

function ExportAction({
  icon: Icon,
  children,
  onClick,
  disabled = false,
  copied = false,
  suffix,
}: ExportActionProps) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={
          copied ? "size-4 shrink-0 text-emerald-600" : "size-4 shrink-0 text-brand-primary"
        }
      />

      <span className="min-w-0 flex-1">{children}</span>

      {suffix && <span className="font-mono text-xs text-text-muted">{suffix}</span>}
    </button>
  );
}

export function ExportMenu() {
  const menuId = useId();

  const {
    detailsRef,
    fileInputRef,
    setIsOpen,
    copied,
    copiedLink,
    message,
    setMessage,
    formula,
    closeMenu,
    copyFormula,
    copyShareLink,
    handleSvgExport,
    handlePngExport,
    handleJsonExport,
    handleImport,
  } = useExportMenu();

  const canUndo = useVennStore((state) => state.past.length > 0);
  const canRedo = useVennStore((state) => state.future.length > 0);
  const undo = useVennStore((state) => state.undo);
  const redo = useVennStore((state) => state.redo);

  function handleUndo(): void {
    undo();
    closeMenu();
  }

  function handleRedo(): void {
    redo();
    closeMenu();
  }

  return (
    <details
      className="relative"
      onToggle={(event) => {
        const open = event.currentTarget.open;

        setIsOpen(open);

        if (!open) {
          setMessage(null);
        }
      }}
      ref={detailsRef}
    >
      <summary
        aria-controls={menuId}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-white text-brand-primary transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:h-10 sm:w-auto sm:gap-2 sm:px-3"
      >
        <MoreHorizontal aria-hidden="true" className="size-5 sm:hidden" />
        <span className="sr-only sm:hidden">Acciones del diagrama</span>

        <Download aria-hidden="true" className="hidden size-4 sm:block" />
        <span className="hidden text-sm font-semibold sm:inline">Exportar</span>
      </summary>

      <div
        aria-label="Opciones de exportación y uso compartido"
        className="fixed top-16 right-3 left-3 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-lg border border-border bg-white text-text shadow-lg sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-80"
        id={menuId}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-primary">
              <span className="sm:hidden">Acciones del diagrama</span>
              <span className="hidden sm:inline">Exportar y compartir</span>
            </p>

            <p className="mt-1 text-xs text-text-muted">Guarda o comparte tu diagrama.</p>
          </div>

          <button
            aria-label="Cerrar menú"
            className="grid size-8 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={closeMenu}
            title="Cerrar"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-1 border-b border-border p-2 sm:hidden">
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canUndo}
            onClick={handleUndo}
            type="button"
          >
            <Undo2 aria-hidden="true" className="size-4" />
            Deshacer
          </button>

          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canRedo}
            onClick={handleRedo}
            type="button"
          >
            <Redo2 aria-hidden="true" className="size-4" />
            Rehacer
          </button>
        </div>

        <div className="grid gap-0.5 p-2">
          <ExportAction icon={FileCode2} onClick={handleSvgExport}>
            Descargar SVG
          </ExportAction>

          <ExportAction icon={Image} onClick={() => void handlePngExport()}>
            Descargar PNG
          </ExportAction>

          <ExportAction icon={FileJson} onClick={handleJsonExport} suffix="JSON">
            Descargar proyecto
          </ExportAction>
        </div>

        <div className="border-t border-border p-2">
          <ExportAction
            copied={copied}
            disabled={!formula}
            icon={copied ? Check : Clipboard}
            onClick={() => void copyFormula()}
          >
            {copied ? "Fórmula copiada" : "Copiar fórmula"}
          </ExportAction>

          <ExportAction
            copied={copiedLink}
            icon={copiedLink ? Check : Link2}
            onClick={() => void copyShareLink()}
          >
            {copiedLink ? "Enlace copiado" : "Copiar enlace"}
          </ExportAction>
        </div>

        <div className="border-t border-border p-2">
          <ExportAction icon={Upload} onClick={() => fileInputRef.current?.click()} suffix="JSON">
            Importar proyecto
          </ExportAction>

          <input
            accept=".json,.venn.json,application/json"
            aria-label="Seleccionar archivo de proyecto"
            className="hidden"
            onChange={(event) => void handleImport(event)}
            ref={fileInputRef}
            type="file"
          />
        </div>

        {message && (
          <div
            aria-atomic="true"
            className={[
              "border-t border-border px-4 py-3 text-xs font-medium",
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            ].join(" ")}
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </div>
        )}
      </div>
    </details>
  );
}
