import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

async function renameSet(page: Page, currentName: string, nextName: string) {
  await page
    .getByRole("button", {
      name: `Renombrar conjunto ${currentName}`,
      exact: true,
    })
    .click();

  const input = page.getByRole("textbox", {
    name: `Nuevo nombre para ${currentName}`,
    exact: true,
  });

  await input.fill(nextName);
  await input.press("Enter");

  await expect(
    page.getByRole("button", {
      name: `Renombrar conjunto ${nextName}`,
      exact: true,
    }),
  ).toBeVisible();
}

async function openExportMenu(page: Page) {
  const summary = page.locator("summary").filter({
    hasText: /^Exportar$/,
  });
  const details = page.locator("details").filter({ has: summary });

  if ((await details.getAttribute("open")) === null) {
    await summary.click();
  }

  await expect(
    page.getByRole("button", {
      name: "Cerrar menú",
      exact: true,
    }),
  ).toBeVisible();
}

async function downloadProject(page: Page, path: string) {
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

  return JSON.parse(await readFile(path, "utf8"));
}

test("completa el flujo del editor en el build de producción", async ({
  page,
  browser,
}, testInfo) => {
  const browserErrors: string[] = [];

  page.on("pageerror", (error) => browserErrors.push(error.message));

  const formula = page.getByRole("textbox", {
    name: "Expresión",
    exact: true,
  });
  const status = page.locator("#venn-formula-status");

  await test.step("abre la aplicación y selecciona una región con un clic real", async () => {
    await page.goto("/");

    const canvas = page.getByRole("application", {
      name: "Diagrama de Venn interactivo",
    });

    await expect(canvas).toBeVisible();

    // (450, 300) está dentro de la intersección de los círculos iniciales A y B.
    const point = await canvas.evaluate((element) => {
      const svg = element as SVGSVGElement;
      const matrix = svg.getScreenCTM();

      if (matrix === null) {
        throw new Error("El canvas no tiene una transformación de pantalla.");
      }

      const position = svg.createSVGPoint();
      position.x = 450;
      position.y = 300;

      const screen = position.matrixTransform(matrix);

      return {
        x: screen.x,
        y: screen.y,
      };
    });

    await page.mouse.click(point.x, point.y);

    await expect(status).toContainText("Fórmula mínima");
    await expect(status).toContainText("1 región seleccionada");
    await expect(formula).toHaveValue(/A\s*∩\s*B|B\s*∩\s*A/);
  });

  await test.step("crea y renombra un conjunto, luego deshace y rehace", async () => {
    await page
      .getByRole("button", {
        name: "Añadir conjunto",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Renombrar conjunto C",
        exact: true,
      }),
    ).toBeVisible();

    await renameSet(page, "C", "D");

    await page
      .getByRole("button", {
        name: "Deshacer",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Renombrar conjunto C",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Renombrar conjunto D",
        exact: true,
      }),
    ).toHaveCount(0);

    await page
      .getByRole("button", {
        name: "Rehacer",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: "Renombrar conjunto D",
        exact: true,
      }),
    ).toBeVisible();
  });

  await test.step("escribe una fórmula y espera el resultado de WASM", async () => {
    await formula.fill("A ∩ B ∩ D");
    await formula.press("Enter");
    await formula.press("Tab");

    await expect(status).toContainText("Fórmula mínima");
    await expect(status).toContainText("1 región seleccionada");
    await expect(formula).not.toHaveValue("");
    await expect(formula).toHaveAttribute("aria-invalid", "false");
  });

  const originalFormula = await formula.inputValue();
  const projectPath = testInfo.outputPath("project.venn.json");

  const project = await test.step("exporta el proyecto", async () => {
    const exported = await downloadProject(page, projectPath);

    expect(exported.version).toBe(1);
    expect(exported.diagram.sets.map((set: { name: string }) => set.name)).toEqual(["A", "B", "D"]);

    const setIds = exported.diagram.sets.map((set: { id: string }) => set.id);

    expect(exported.selectedRegionIds).toHaveLength(1);

    const selectedSetIds = exported.selectedRegionIds[0].split(":").slice(1);

    expect(selectedSetIds.sort()).toEqual([...setIds].sort());

    await page
      .getByRole("button", {
        name: "Cerrar menú",
        exact: true,
      })
      .click();

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

    await expect(
      page.getByRole("button", {
        name: "Renombrar conjunto D",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Renombrar conjunto E",
        exact: true,
      }),
    ).toHaveCount(0);

    await expect(status).toContainText("Fórmula mínima");
    await expect(formula).toHaveValue(originalFormula);

    const restored = await downloadProject(page, testInfo.outputPath("restored.venn.json"));

    expect(restored).toEqual(project);
  });

  await test.step("copia un enlace compartido y lo abre en una sesión nueva", async () => {
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

    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(new URLSearchParams(url.hash.slice(1)).has("venn")).toBe(true);

    const sharedContext = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1000,
      },
    });

    try {
      const sharedPage = await sharedContext.newPage();

      sharedPage.on("pageerror", (error) => browserErrors.push(error.message));

      await sharedPage.goto(link);

      for (const name of ["A", "B", "D"]) {
        await expect(
          sharedPage.getByRole("button", {
            name: `Renombrar conjunto ${name}`,
            exact: true,
          }),
        ).toBeVisible();
      }

      const sharedStatus = sharedPage.locator("#venn-formula-status");

      await expect(sharedStatus).toContainText("Fórmula mínima");
      await expect(sharedStatus).toContainText("1 región seleccionada");

      await expect(
        sharedPage.getByRole("textbox", {
          name: "Expresión",
          exact: true,
        }),
      ).toHaveValue(originalFormula);

      await expect.poll(() => new URL(sharedPage.url()).hash).toBe("");
    } finally {
      await sharedContext.close();
    }
  });

  expect(browserErrors).toEqual([]);
});
