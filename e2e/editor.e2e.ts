import { readFile } from "node:fs/promises";

import { expect, type Locator, type Page, test } from "@playwright/test";

interface ExportedSet {
  id: string;
  name: string;
}

interface ExportedProject {
  version: 1;
  diagram: {
    sets: ExportedSet[];
  };
  selectedRegionIds: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExportedSet(value: unknown): value is ExportedSet {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === "string");
}

function assertExportedProject(value: unknown): asserts value is ExportedProject {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isRecord(value.diagram) ||
    !Array.isArray(value.diagram.sets) ||
    !value.diagram.sets.every(isExportedSet) ||
    !isStringArray(value.selectedRegionIds)
  ) {
    throw new Error("El archivo exportado no contiene un proyecto válido.");
  }
}

test.use({
  viewport: {
    width: 1440,
    height: 1000,
  },
});

function getFormulaInput(page: Page): Locator {
  return page.getByRole("textbox", {
    name: "Expresión",
    exact: true,
  });
}

async function getFormulaStatus(page: Page): Promise<Locator> {
  const input = getFormulaInput(page);

  await expect(input).toHaveAttribute("aria-describedby", /\S+/);

  const statusId = await input.getAttribute("aria-describedby");

  if (!statusId) {
    throw new Error("El editor de fórmulas no tiene un estado asociado.");
  }

  return page.locator(`[id="${statusId}"]`);
}

function getRenameButton(page: Page, name: string): Locator {
  return page.getByRole("button", {
    name: `Editar conjunto ${name}, 0 elementos`,
    exact: true,
  });
}

async function renameSet(page: Page, currentName: string, nextName: string): Promise<void> {
  await getRenameButton(page, currentName).click();

  const form = page.getByRole("form", {
    name: `Editar conjunto ${currentName}`,
    exact: true,
  });

  await form
    .getByRole("textbox", {
      name: "Nombre",
      exact: true,
    })
    .fill(nextName);

  await form
    .getByRole("button", {
      name: "Guardar",
      exact: true,
    })
    .click();

  await expect(getRenameButton(page, nextName)).toBeVisible();
}

async function openExportMenu(page: Page): Promise<void> {
  const summary = page.locator("summary").filter({
    has: page.getByText("Exportar", { exact: true }),
  });

  const closeButton = page.getByRole("button", {
    name: "Cerrar menú",
    exact: true,
  });

  await expect(summary).toBeVisible();

  if (!(await closeButton.isVisible())) {
    await summary.click();
  }

  await expect(closeButton).toBeVisible();
}

async function closeExportMenu(page: Page): Promise<void> {
  const closeButton = page.getByRole("button", {
    name: "Cerrar menú",
    exact: true,
  });

  await closeButton.click();
  await expect(closeButton).toBeHidden();
}

async function downloadProject(page: Page, path: string): Promise<ExportedProject> {
  await openExportMenu(page);

  const downloadPromise = page.waitForEvent("download");

  await page
    .getByRole("button", {
      name: /Descargar proyecto/,
    })
    .click();

  const download = await downloadPromise;

  expect(await download.failure()).toBeNull();

  await download.saveAs(path);

  const content = await readFile(path, "utf8");
  const project: unknown = JSON.parse(content);

  assertExportedProject(project);

  return project;
}

async function expectMinimumFormula(page: Page, expectedFormula?: string): Promise<void> {
  const status = await getFormulaStatus(page);
  const input = getFormulaInput(page);

  await expect(status).toContainText("Fórmula mínima");
  await expect(status).toContainText("1 región seleccionada");
  await expect(input).toHaveAttribute("aria-invalid", "false");

  if (expectedFormula !== undefined) {
    await expect(input).toHaveValue(expectedFormula);
  } else {
    await expect(input).not.toHaveValue("");
  }
}

async function clickInitialIntersection(page: Page): Promise<void> {
  const canvas = page.getByRole("img", {
    name: "Diagrama de Venn",
    exact: true,
  });

  await expect(canvas).toBeVisible();

  const point = await canvas.evaluate((element) => {
    if (!(element instanceof SVGSVGElement)) {
      throw new Error("El diagrama no es un elemento SVG.");
    }

    const matrix = element.getScreenCTM();

    if (!matrix) {
      throw new Error("El diagrama no tiene una transformación de pantalla.");
    }

    // Centro de la intersección de los conjuntos iniciales A y B.
    const position = element.createSVGPoint();
    position.x = 450;
    position.y = 300;

    const screenPoint = position.matrixTransform(matrix);

    return {
      x: screenPoint.x,
      y: screenPoint.y,
    };
  });

  await page.mouse.click(point.x, point.y);
}

test("completa el flujo del editor en el build de producción", async ({
  page,
  browser,
  browserName,
  context,
}, testInfo) => {
  const browserErrors: string[] = [];

  function trackPageErrors(trackedPage: Page): void {
    trackedPage.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
  }

  trackPageErrors(page);

  const formula = getFormulaInput(page);

  await test.step("abre la aplicación y selecciona una región con un clic real", async () => {
    await page.goto("/");
    await clickInitialIntersection(page);
    await expectMinimumFormula(page);

    await expect(formula).toHaveValue(/^(?:A\s*∩\s*B|B\s*∩\s*A)$/);
  });

  await test.step("crea y renombra un conjunto, luego deshace y rehace", async () => {
    await page
      .getByRole("button", {
        name: "Añadir conjunto",
        exact: true,
      })
      .click();

    await expect(getRenameButton(page, "C")).toBeVisible();

    await renameSet(page, "C", "D");

    await page
      .getByRole("button", {
        name: "Deshacer",
        exact: true,
      })
      .click();

    await expect(getRenameButton(page, "C")).toBeVisible();
    await expect(getRenameButton(page, "D")).toHaveCount(0);

    await page
      .getByRole("button", {
        name: "Rehacer",
        exact: true,
      })
      .click();

    await expect(getRenameButton(page, "D")).toBeVisible();
    await expect(getRenameButton(page, "C")).toHaveCount(0);
  });

  await test.step("escribe una fórmula y espera el resultado de WASM", async () => {
    await formula.fill("A ∩ B ∩ D");
    await formula.press("Enter");
    await formula.press("Tab");

    await expectMinimumFormula(page);
  });

  const originalFormula = await formula.inputValue();
  const projectPath = testInfo.outputPath("project.venn.json");

  const project = await test.step("exporta el proyecto", async () => {
    const exported = await downloadProject(page, projectPath);

    expect(exported.version).toBe(1);
    expect(exported.diagram.sets.map((set) => set.name)).toEqual(["A", "B", "D"]);
    expect(exported.selectedRegionIds).toHaveLength(1);

    const selectedRegionId = exported.selectedRegionIds[0];

    if (!selectedRegionId) {
      throw new Error("El proyecto exportado no contiene la región seleccionada.");
    }

    const selectedSetIds = selectedRegionId.split(":").slice(1);
    const setIds = exported.diagram.sets.map((set) => set.id);

    expect(selectedSetIds.sort()).toEqual([...setIds].sort());

    await closeExportMenu(page);

    return exported;
  });

  await test.step("modifica el diagrama y lo restaura desde el archivo exportado", async () => {
    await renameSet(page, "D", "E");
    await openExportMenu(page);

    const chooserPromise = page.waitForEvent("filechooser");

    await page
      .getByRole("button", {
        name: /Importar proyecto/,
      })
      .click();

    const chooser = await chooserPromise;

    await chooser.setFiles(projectPath);

    await expect(
      page.getByText("Proyecto importado correctamente.", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(getRenameButton(page, "D")).toBeVisible();
    await expect(getRenameButton(page, "E")).toHaveCount(0);
    await expectMinimumFormula(page, originalFormula);

    const restored = await downloadProject(page, testInfo.outputPath("restored.venn.json"));

    expect(restored).toEqual(project);
  });

  await test.step("copia un enlace compartido y lo abre en una sesión nueva", async () => {
    const origin = new URL(page.url()).origin;

    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    }

    await openExportMenu(page);

    await page
      .getByRole("button", {
        name: "Copiar enlace",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Enlace copiado",
        exact: true,
      }),
    ).toBeVisible();

    const link = await page.evaluate(() => navigator.clipboard.readText());
    const url = new URL(link);

    expect(url.origin).toBe(origin);
    expect(new URLSearchParams(url.hash.slice(1)).has("venn")).toBe(true);

    const sharedContext = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1000,
      },
    });

    try {
      const sharedPage = await sharedContext.newPage();

      trackPageErrors(sharedPage);

      await sharedPage.goto(link);

      for (const name of ["A", "B", "D"]) {
        await expect(getRenameButton(sharedPage, name)).toBeVisible();
      }

      await expectMinimumFormula(sharedPage, originalFormula);
      await expect(sharedPage).toHaveURL((currentUrl) => currentUrl.hash === "");
    } finally {
      await sharedContext.close();
    }
  });

  expect(browserErrors).toEqual([]);
});
