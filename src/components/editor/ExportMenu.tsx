import { useEffect, useRef, useState, type ChangeEvent } from "react";

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

import { createShareUrl } from "@/domain/venn/share-project";

import {
  exportDiagramPng,
  exportDiagramSvg,
  exportProjectJson,
} from "@/domain/venn/export-diagram";

import { getSelectedRegionsExpression } from "@/domain/venn/expressions";

import { createProjectFile, parseProjectFile } from "@/domain/venn/project-file";

import { useVennStore } from "@/state/venn-store";

export function ExportMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const diagram = useVennStore((state) => state.diagram);

  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);

  const importProject = useVennStore((state) => state.importProject);

  const [isOpen, setIsOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const formula = getSelectedRegionsExpression(diagram, selectedRegionIds);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");

    setIsOpen(false);
    setMessage(null);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const details = detailsRef.current;

      if (details && event.target instanceof Node && !details.contains(event.target)) {
        closeMenu();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({
      text,
      type,
    });
  }

  async function copyFormula() {
    if (!formula) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formula);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1_500);
    } catch {
      showMessage("No fue posible copiar la fórmula.", "error");
    }
  }

  async function copyShareLink() {
    try {
      const link = createShareUrl(diagram, selectedRegionIds);

      await navigator.clipboard.writeText(link);

      setCopiedLink(true);

      window.setTimeout(() => {
        setCopiedLink(false);
      }, 1_500);
    } catch {
      showMessage("No fue posible copiar el enlace.", "error");
    }
  }

  function handleSvgExport() {
    try {
      exportDiagramSvg(diagram.metadata.name);

      showMessage("SVG descargado.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "No fue posible descargar el SVG.",
        "error",
      );
    }
  }

  async function handlePngExport() {
    try {
      await exportDiagramPng(diagram.metadata.name);

      showMessage("PNG descargado.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "No fue posible descargar el PNG.",
        "error",
      );
    }
  }

  function handleJsonExport() {
    try {
      exportProjectJson(
        diagram.metadata.name,

        createProjectFile(diagram, selectedRegionIds),
      );

      showMessage("Proyecto descargado.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "No fue posible descargar el proyecto.",
        "error",
      );
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();

      const parsedJson: unknown = JSON.parse(content);

      const project = parseProjectFile(parsedJson);

      importProject(project.diagram, project.selectedRegionIds);

      showMessage("Proyecto importado correctamente.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "No fue posible importar el proyecto.",
        "error",
      );
    } finally {
      event.target.value = "";
    }
  }

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
      <summary className="flex size-9 cursor-pointer list-none items-center justify-center gap-2 rounded-lg text-sm font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:h-10 sm:w-auto sm:px-3">
        <Download aria-hidden="true" className="size-4" />

        <span className="hidden sm:inline">Exportar</span>
      </summary>

      <div className="fixed top-16 right-3 left-3 z-50 overflow-hidden rounded-xl border border-border bg-white text-text shadow-xl sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-3 sm:w-72">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Exportar</p>

            <p className="mt-1 text-sm text-text-muted">Descarga o comparte el diagrama.</p>
          </div>

          <button
            aria-label="Cerrar menú"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
            onClick={closeMenu}
            title="Cerrar"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="grid gap-1 p-2">
          <button
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-text transition-colors hover:bg-surface"
            onClick={handleSvgExport}
            type="button"
          >
            <FileCode2 aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />

            <span className="min-w-0 flex-1">Descargar SVG</span>
          </button>

          <button
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-text transition-colors hover:bg-surface"
            onClick={() => {
              void handlePngExport();
            }}
            type="button"
          >
            <Image aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />

            <span className="min-w-0 flex-1">Descargar PNG</span>
          </button>

          <button
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-text transition-colors hover:bg-surface"
            onClick={handleJsonExport}
            type="button"
          >
            <FileJson aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />

            <span className="min-w-0 flex-1">Descargar proyecto</span>

            <span className="font-mono text-xs font-medium text-text-muted">JSON</span>
          </button>

          <button
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!formula}
            onClick={() => {
              void copyFormula();
            }}
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
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-text transition-colors hover:bg-surface"
            onClick={() => {
              void copyShareLink();
            }}
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-text transition-colors hover:bg-surface"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />

            <span className="min-w-0 flex-1">Importar proyecto</span>

            <span className="font-mono text-xs font-medium text-text-muted">JSON</span>
          </button>

          <input
            ref={fileInputRef}
            accept=".json,.venn.json,application/json"
            className="hidden"
            onChange={(event) => {
              void handleImport(event);
            }}
            type="file"
          />
        </div>

        {message && (
          <div
            aria-live="polite"
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
