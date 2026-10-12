import type { VennDiagram } from "@/domain/venn/models";
import type { VennProjectFile } from "@/domain/venn/project-file";
import {
  createCompactProject,
  createDiagramFromCompactProject,
  parseCompactProject,
} from "@/domain/venn/shared-project-format";

const SHARE_PARAMETER = "venn";

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");

  const missingPadding = normalized.length % 4;

  const padding = missingPadding === 0 ? "" : "=".repeat(4 - missingPadding);

  const binary = window.atob(normalized + padding);

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function createShareUrl(diagram: VennDiagram, selectedRegionIds: string[]): string {
  const compactProject = createCompactProject(diagram, selectedRegionIds);

  const encoded = encodeBase64Url(JSON.stringify(compactProject));

  const url = new URL(window.location.href);

  // Elimina cualquier enlace antiguo
  // que estuviera en los parámetros.
  url.searchParams.delete(SHARE_PARAMETER);

  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ""));

  hashParameters.set(SHARE_PARAMETER, encoded);

  url.hash = hashParameters.toString();

  return url.toString();
}

export function consumeSharedProject(): VennProjectFile | null {
  const url = new URL(window.location.href);

  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ""));

  const encoded = hashParameters.get(SHARE_PARAMETER);

  if (!encoded) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(encoded);

    const rawProject: unknown = JSON.parse(decoded);

    const compactProject = parseCompactProject(rawProject);

    return createDiagramFromCompactProject(compactProject);
  } finally {
    hashParameters.delete(SHARE_PARAMETER);

    const remainingHash = hashParameters.toString();

    url.hash = remainingHash ? remainingHash : "";

    window.history.replaceState({}, "", url);
  }
}
