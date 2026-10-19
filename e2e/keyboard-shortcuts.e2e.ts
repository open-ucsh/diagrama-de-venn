import { expect, type Page, test } from "@playwright/test";

function formulaInput(page: Page) {
  return page.getByRole("textbox", { name: "Expresión", exact: true });
}

function helpButton(page: Page) {
  return page.getByRole("button", { name: "Atajos de teclado", exact: true });
}

function regionsPanel(page: Page) {
  return page.locator("details").filter({
    has: page.locator("summary").filter({ hasText: /^Regiones$/ }),
  });
}

async function focusOutsideInput(page: Page): Promise<void> {
  await helpButton(page).focus();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(formulaInput(page)).toBeVisible();
});

for (const modifier of ["Control", "Meta"] as const) {
  test.describe(`Atajos con ${modifier}`, () => {
    test("deshace y rehace una acción del editor", async ({ page }) => {
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
      await focusOutsideInput(page);

      await page.keyboard.press(`${modifier}+KeyZ`);
      await expect(addedSet).toHaveCount(0);

      await page.keyboard.press(`${modifier}+Shift+KeyZ`);
      await expect(addedSet).toBeVisible();
    });

    test("enfoca y limpia la fórmula", async ({ page }) => {
      const formula = formulaInput(page);

      await focusOutsideInput(page);
      await page.keyboard.press(`${modifier}+Slash`);
      await expect(formula).toBeFocused();

      await formula.fill("A");
      await formula.press("Enter");
      await focusOutsideInput(page);
      await expect(formula).not.toHaveValue("");

      await page.keyboard.press(`${modifier}+Shift+Backspace`);

      await expect(formula).toBeFocused();
      await expect(formula).toHaveValue("");
    });

    test("abre y cierra conjuntos, regiones e historial", async ({ page }) => {
      const sets = page.getByRole("button", { name: /^Conjuntos/ });
      const regions = regionsPanel(page);
      const history = page.locator("details").filter({
        has: page.getByLabel("Abrir historial de fórmulas", { exact: true }),
      });

      await expect(sets).toHaveAttribute("aria-expanded", "true");
      await focusOutsideInput(page);

      await page.keyboard.press(`${modifier}+Shift+Digit1`);
      await expect(sets).toHaveAttribute("aria-expanded", "false");

      await page.keyboard.press(`${modifier}+Shift+Digit1`);
      await expect(sets).toHaveAttribute("aria-expanded", "true");

      await page.keyboard.press(`${modifier}+Shift+Digit2`);
      await expect(regions).toHaveAttribute("open", "");

      await page.keyboard.press(`${modifier}+Shift+Digit2`);
      await expect(regions).not.toHaveAttribute("open");

      await page.keyboard.press(`${modifier}+Shift+Digit3`);
      await expect(history).toHaveAttribute("open", "");

      await page.keyboard.press("Escape");
      await expect(history).not.toHaveAttribute("open");
      await expect(history.locator("summary")).toBeFocused();
    });

    test("respeta los campos de texto", async ({ page }) => {
      const formula = formulaInput(page);
      const regions = regionsPanel(page);
      const sets = page.getByRole("button", { name: /^Conjuntos/ });
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

      await formula.focus();

      await page.keyboard.press(`${modifier}+Shift+Digit1`);
      await expect(sets).toHaveAttribute("aria-expanded", "true");

      await page.keyboard.press(`${modifier}+Shift+Digit2`);
      await expect(regions).not.toHaveAttribute("open");

      await page.keyboard.press(`${modifier}+KeyZ`);
      await expect(addedSet).toBeVisible();
      await expect(formula).toBeFocused();
    });
  });
}

test("recorre y selecciona regiones usando el teclado", async ({ page }) => {
  const regions = regionsPanel(page);
  const summary = regions.locator("summary");
  const options = regions.getByRole("button");

  await summary.focus();
  await summary.press("Enter");
  await expect(regions).toHaveAttribute("open", "");

  await summary.press("ArrowDown");
  await expect(options.first()).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toBeFocused();

  await page.keyboard.press("Home");
  await expect(options.first()).toBeFocused();

  await page.keyboard.press("End");
  await expect(options.last()).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(options.last()).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Space");
  await expect(options.last()).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Escape");
  await expect(regions).not.toHaveAttribute("open");
  await expect(summary).toBeFocused();
});

test("muestra las teclas de cada sistema y restaura el foco", async ({ page }) => {
  const trigger = helpButton(page);
  const dialog = page.getByRole("dialog", {
    name: "Atajos de teclado",
    exact: true,
  });

  await trigger.click();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "macOS", exact: true }).click();
  await expect(dialog.locator("kbd").filter({ hasText: /^⌘$/ }).first()).toBeVisible();

  await dialog
    .getByRole("button", {
      name: "Windows / Linux",
      exact: true,
    })
    .click();

  await expect(
    dialog
      .locator("kbd")
      .filter({ hasText: /^Ctrl$/ })
      .first(),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();

  await page
    .getByRole("img", {
      name: "Diagrama de Venn",
      exact: true,
    })
    .click({ position: { x: 5, y: 5 } });

  await expect(dialog).toBeHidden();
});
