import { useExportMenu } from "./use-export-menu";

import {
  Check,
  Clipboard,
  Download,
  FileCode2,
  FileJson,
  Image,
  Link2,
  Upload,
  X,
} from "lucide-react";

export function ExportMenu() {
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

  return (
    <details
      className="relative"
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);

        if (!event.currentTarget.open) {
          setMessage(null);
        }
      }}
      ref={detailsRef}
    >
      <summary
        aria-controls="export-menu"
        className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-brand-primary transition-colors hover:border-brand-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Download aria-hidden="true" className="size-4" />
        <span>Exportar</span>
      </summary>

      <div
        aria-label="Opciones de exportación y uso compartido"
        className="fixed top-20 right-3 left-3 z-50 overflow-hidden rounded-md border border-border bg-white text-text shadow-lg sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-80"
        id="export-menu"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-primary">Exportar y compartir</p>
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

        <div className="grid gap-0.5 p-2">
          <button
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={handleSvgExport}
            type="button"
          >
            <FileCode2 aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
            <span className="min-w-0 flex-1">Descargar SVG</span>
          </button>

          <button
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={() => void handlePngExport()}
            type="button"
          >
            <Image aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
            <span className="min-w-0 flex-1">Descargar PNG</span>
          </button>

          <button
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={handleJsonExport}
            type="button"
          >
            <FileJson aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
            <span className="min-w-0 flex-1">Descargar proyecto</span>
            <span className="font-mono text-xs text-text-muted">JSON</span>
          </button>
        </div>

        <div className="border-t border-border p-2">
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!formula}
            onClick={() => void copyFormula()}
            type="button"
          >
            {copied ? (
              <Check aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <Clipboard aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
            )}
            <span className="min-w-0 flex-1">{copied ? "Fórmula copiada" : "Copiar fórmula"}</span>
          </button>

          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={() => void copyShareLink()}
            type="button"
          >
            {copiedLink ? (
              <Check aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <Link2 aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
            )}
            <span className="min-w-0 flex-1">
              {copiedLink ? "Enlace copiado" : "Copiar enlace"}
            </span>
          </button>
        </div>

        <div className="border-t border-border p-2">
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
            <span className="min-w-0 flex-1">Importar proyecto</span>
            <span className="font-mono text-xs text-text-muted">JSON</span>
          </button>

          <input
            accept=".json,.venn.json,application/json"
            className="hidden"
            onChange={(event) => void handleImport(event)}
            ref={fileInputRef}
            type="file"
          />
        </div>

        {message && (
          <div
            aria-atomic="true"
            aria-live={message.type === "error" ? "assertive" : "polite"}
            role={message.type === "error" ? "alert" : "status"}
            className={[
              "border-t border-border px-4 py-3 text-xs font-medium",
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}
      </div>
    </details>
  );
}
