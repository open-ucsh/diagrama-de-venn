const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function getSafeFileName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "diagrama-venn";
}

function inlineComputedStyles(source: SVGSVGElement, clone: SVGSVGElement) {
  const sourceElements = [source, ...source.querySelectorAll("*")];

  const clonedElements = [clone, ...clone.querySelectorAll("*")];

  const properties = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "opacity",
    "font-family",
    "font-size",
    "font-weight",
    "paint-order",
  ];

  sourceElements.forEach((sourceElement, index) => {
    const clonedElement = clonedElements[index];

    if (!clonedElement || !(clonedElement instanceof SVGElement)) {
      return;
    }

    const computedStyle = window.getComputedStyle(sourceElement);

    properties.forEach((property) => {
      const value = computedStyle.getPropertyValue(property);

      if (value) {
        clonedElement.style.setProperty(property, value);
      }
    });
  });
}

function createExportSvg(): SVGSVGElement {
  const source = document.querySelector<SVGSVGElement>("[data-venn-canvas]");

  if (!source) {
    throw new Error("No se encontró el diagrama.");
  }

  const clone = source.cloneNode(true) as SVGSVGElement;

  inlineComputedStyles(source, clone);

  clone.querySelectorAll("[data-export-ignore]").forEach((element) => {
    element.remove();
  });

  clone.setAttribute("xmlns", SVG_NAMESPACE);

  clone.setAttribute("width", "900");
  clone.setAttribute("height", "600");

  clone.removeAttribute("class");

  const background = document.createElementNS(SVG_NAMESPACE, "rect");

  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", "900");
  background.setAttribute("height", "600");
  background.setAttribute("fill", "#ffffff");

  clone.insertBefore(background, clone.firstChild);

  return clone;
}

function serializeSvg(): string {
  const svg = createExportSvg();

  return new XMLSerializer().serializeToString(svg);
}

export function exportDiagramSvg(diagramName: string) {
  const source = serializeSvg();

  downloadBlob(
    new Blob([source], {
      type: "image/svg+xml;charset=utf-8",
    }),

    `${getSafeFileName(diagramName)}.svg`,
  );
}

export async function exportDiagramPng(diagramName: string) {
  const source = serializeSvg();

  const svgBlob = new Blob([source], {
    type: "image/svg+xml;charset=utf-8",
  });

  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();

      image.onerror = () => {
        reject(new Error("No fue posible generar la imagen."));
      };

      image.src = url;
    });

    const scale = 2;

    const canvas = document.createElement("canvas");

    canvas.width = 900 * scale;
    canvas.height = 600 * scale;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No fue posible crear la imagen.");
    }

    context.fillStyle = "#ffffff";

    context.fillRect(0, 0, canvas.width, canvas.height);

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("No fue posible generar el PNG."));
          }
        },

        "image/png",
        1,
      );
    });

    downloadBlob(pngBlob, `${getSafeFileName(diagramName)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function exportProjectJson(diagramName: string, project: unknown) {
  const content = JSON.stringify(project, null, 2);

  downloadBlob(
    new Blob([content], {
      type: "application/json;charset=utf-8",
    }),

    `${getSafeFileName(diagramName)}.venn.json`,
  );
}
