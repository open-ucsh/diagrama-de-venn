import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { createShareUrl } from "@/services/venn/share-project";

import {
  exportDiagramPng,
  exportDiagramSvg,
  exportProjectJson,
} from "@/services/venn/export-diagram";

import { getSelectedRegionsExpression } from "@/domain/venn/expressions";

import { createProjectFile, parseProjectFile } from "@/domain/venn/project-file";

import { useVennStore } from "@/state/venn-store";

export function useExportMenu() {
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
    if (!isOpen) return;

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
    setMessage({ text, type });
  }

  async function copyFormula() {
    if (!formula) return;

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
      exportProjectJson(diagram.metadata.name, createProjectFile(diagram, selectedRegionIds));
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

    if (!file) return;

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

  return {
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
  };
}
