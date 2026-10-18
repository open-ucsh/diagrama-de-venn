import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

import { getSelectedMask } from "@/domain/venn/expressions/expression-masks";
import { createProjectFile, parseProjectFile } from "@/domain/venn/project-file";
import {
  exportDiagramPng,
  exportDiagramSvg,
  exportProjectJson,
} from "@/services/venn/export-diagram";
import { createShareUrl } from "@/services/venn/share-project";
import { useVennExpression } from "@/state/venn-expression";
import { useVennStore } from "@/state/venn-store";

const COPY_FEEDBACK_DURATION = 1_500;

interface ExportMessage {
  text: string;
  type: "success" | "error";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function showCopied(): void {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    setCopied(true);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setCopied(false);
    }, COPY_FEEDBACK_DURATION);
  }

  return { copied, showCopied };
}

export function useExportMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);

  const diagram = useVennStore((state) => state.diagram);
  const selectedRegionIds = useVennStore((state) => state.selectedRegionIds);
  const importProject = useVennStore((state) => state.importProject);
  const expression = useVennExpression();

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<ExportMessage | null>(null);

  const formulaFeedback = useCopyFeedback();
  const linkFeedback = useCopyFeedback();

  const setsKey = JSON.stringify(diagram.sets.map(({ id, name }) => ({ id, name })));
  const selectedMask = getSelectedMask(diagram, selectedRegionIds);
  const hasSelection = selectedRegionIds.length > 0;

  // Debe coincidir con la clave utilizada por el editor de fórmulas.
  const searchKey = JSON.stringify([setsKey, selectedMask, hasSelection]);

  const formula =
    hasSelection && expression.key === searchKey && expression.status === "ready"
      ? expression.text
      : null;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const dismissMenu = useCallback((restoreFocus: boolean): void => {
    const details = detailsRef.current;

    if (details) {
      details.open = false;

      if (restoreFocus) {
        details.querySelector("summary")?.focus();
      }
    }

    setIsOpen(false);
    setMessage(null);
  }, []);

  const closeMenu = useCallback((): void => {
    dismissMenu(true);
  }, [dismissMenu]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) {
        return;
      }

      event.preventDefault();
      closeMenu();
    }

    function handlePointerDown(event: PointerEvent): void {
      const details = detailsRef.current;

      if (details && event.target instanceof Node && !details.contains(event.target)) {
        // Un clic fuera conserva el foco en el destino del usuario.
        dismissMenu(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, closeMenu, dismissMenu]);

  function showMessage(text: string, type: ExportMessage["type"]): void {
    if (mountedRef.current) {
      setMessage({ text, type });
    }
  }

  async function copyFormula(): Promise<void> {
    if (!formula) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formula);

      if (mountedRef.current) {
        formulaFeedback.showCopied();
      }
    } catch {
      showMessage("No fue posible copiar la fórmula.", "error");
    }
  }

  async function copyShareLink(): Promise<void> {
    try {
      const link = createShareUrl(diagram, selectedRegionIds);

      await navigator.clipboard.writeText(link);

      if (mountedRef.current) {
        linkFeedback.showCopied();
      }
    } catch {
      showMessage("No fue posible copiar el enlace.", "error");
    }
  }

  function handleSvgExport(): void {
    try {
      exportDiagramSvg(diagram.metadata.name);
      showMessage("SVG descargado.", "success");
    } catch (error) {
      showMessage(getErrorMessage(error, "No fue posible descargar el SVG."), "error");
    }
  }

  async function handlePngExport(): Promise<void> {
    try {
      await exportDiagramPng(diagram.metadata.name);
      showMessage("PNG descargado.", "success");
    } catch (error) {
      showMessage(getErrorMessage(error, "No fue posible descargar el PNG."), "error");
    }
  }

  function handleJsonExport(): void {
    try {
      const project = createProjectFile(diagram, selectedRegionIds);

      exportProjectJson(diagram.metadata.name, project);
      showMessage("Proyecto descargado.", "success");
    } catch (error) {
      showMessage(getErrorMessage(error, "No fue posible descargar el proyecto."), "error");
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();

      if (!mountedRef.current) {
        return;
      }

      const parsedJson: unknown = JSON.parse(content);
      const project = parseProjectFile(parsedJson);

      importProject(project.diagram, project.selectedRegionIds);
      showMessage("Proyecto importado correctamente.", "success");
    } catch (error) {
      showMessage(getErrorMessage(error, "No fue posible importar el proyecto."), "error");
    } finally {
      input.value = "";
    }
  }

  return {
    detailsRef,
    fileInputRef,
    setIsOpen,
    copied: formulaFeedback.copied,
    copiedLink: linkFeedback.copied,
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
  };
}
