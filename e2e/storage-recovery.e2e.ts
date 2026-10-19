import { expect, type Page, test } from "@playwright/test";

const STORAGE_KEY = "venn-editor";
const RECOVERY_TITLE = "No pudimos recuperar tu diagrama";

async function seedStorage(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      const marker = "storage-recovery-test-seeded";

      if (window.sessionStorage.getItem(marker) === "true") {
        return;
      }

      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem(marker, "true");
    },
    { key: STORAGE_KEY, value: raw },
  );
}

async function readStorage(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

function recoveryTitle(page: Page) {
  return page.getByRole("heading", {
    name: RECOVERY_TITLE,
    exact: true,
  });
}

const invalidStates = [
  {
    name: "JSON inválido",
    raw: "{broken",
    message: "El diagrama guardado contiene datos que no se pueden leer.",
  },
  {
    name: "versión desconocida",
    raw: JSON.stringify({ version: 99, state: {} }),
    message: "El diagrama guardado pertenece a una versión incompatible.",
  },
  {
    name: "datos incompletos",
    raw: JSON.stringify({
      version: 1,
      state: { diagram: { id: "incomplete" } },
    }),
    message: "El diagrama guardado contiene datos incompletos o inválidos.",
  },
];

for (const invalid of invalidStates) {
  test.describe(invalid.name, () => {
    test.beforeEach(async ({ page }) => {
      await seedStorage(page, invalid.raw);
      await page.goto("/");

      await expect(recoveryTitle(page)).toBeVisible();
      await expect(
        page.getByText(invalid.message, {
          exact: false,
        }),
      ).toBeVisible();

      await expect(
        page.getByRole("img", {
          name: "Diagrama de Venn",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("permite editar sin sobrescribir el estado inválido y empezar de nuevo", async ({
      page,
    }) => {
      const addedSet = page.getByRole("button", {
        name: "Editar conjunto C, 0 elementos",
        exact: true,
      });

      await page
        .getByRole("button", {
          name: "Añadir conjunto",
          exact: true,
        })
        .click();

      await expect(addedSet).toBeVisible();
      expect(await readStorage(page)).toBe(invalid.raw);

      await page
        .getByRole("button", {
          name: "Empezar con un diagrama vacío",
          exact: true,
        })
        .click();

      await expect(recoveryTitle(page)).toBeHidden();
      await expect(addedSet).toHaveCount(0);

      await expect.poll(() => readStorage(page)).not.toBe(invalid.raw);
      await expect.poll(() => readStorage(page)).not.toBeNull();

      await page.reload();

      await expect(recoveryTitle(page)).toBeHidden();
      await expect(
        page.getByRole("textbox", {
          name: "Expresión",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("elimina el estado inválido sin recrearlo inmediatamente", async ({ page }) => {
      expect(await readStorage(page)).toBe(invalid.raw);

      await page
        .getByRole("button", {
          name: "Eliminar estado guardado",
          exact: true,
        })
        .click();

      await expect(recoveryTitle(page)).toBeHidden();
      await expect.poll(() => readStorage(page)).toBeNull();

      await page.reload();

      await expect(recoveryTitle(page)).toBeHidden();
      await expect(
        page.getByRole("textbox", {
          name: "Expresión",
          exact: true,
        }),
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: "Añadir conjunto",
          exact: true,
        })
        .click();

      await expect(
        page.getByRole("button", {
          name: "Editar conjunto C, 0 elementos",
          exact: true,
        }),
      ).toBeVisible();

      await expect.poll(() => readStorage(page)).not.toBeNull();
    });
  });
}

test("recupera un diagrama válido después de recargar", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", {
      name: "Añadir conjunto",
      exact: true,
    })
    .click();

  const addedSet = page.getByRole("button", {
    name: "Editar conjunto C, 0 elementos",
    exact: true,
  });

  await expect(addedSet).toBeVisible();
  const saved = await readStorage(page);
  expect(saved).not.toBeNull();

  await page.reload();

  await expect(addedSet).toBeVisible();
  await expect(recoveryTitle(page)).toBeHidden();
  expect(await readStorage(page)).toBe(saved);
});

test("recupera campos opcionales ausentes sin perder el diagrama", async ({ page }) => {
  const raw = JSON.stringify({
    version: 1,
    state: {
      diagram: {
        id: "recoverable-diagram",
        metadata: {
          name: "Diagrama recuperable",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        sets: [
          {
            id: "set-a",
            name: "A",
            position: { x: 370, y: 300 },
            radius: 160,
          },
          {
            id: "set-b",
            name: "B",
            position: { x: 530, y: 300 },
            radius: 160,
          },
        ],
        elements: [],
      },
    },
  });

  await seedStorage(page, raw);
  await page.goto("/");

  await expect(recoveryTitle(page)).toBeHidden();

  await expect(
    page.getByRole("button", {
      name: "Editar conjunto A, 0 elementos",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Editar conjunto B, 0 elementos",
      exact: true,
    }),
  ).toBeVisible();

  await expect(page.getByTitle("Cambiar nombre del diagrama")).toContainText(
    "Diagrama recuperable",
  );

  expect(await readStorage(page)).toBe(raw);
});
