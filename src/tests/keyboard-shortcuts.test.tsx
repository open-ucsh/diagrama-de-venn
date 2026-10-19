import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHistoryShortcuts } from "@/components/editor/use-history-shortcuts";
import { useKeyboardShortcut } from "@/components/editor/use-keyboard-shortcut";

interface HarnessProps {
  canUndo?: boolean;
  canRedo?: boolean;
}

const undo = vi.fn();
const redo = vi.fn();
const clearFormula = vi.fn();
const toggleSets = vi.fn();
const toggleRegions = vi.fn();
const toggleHistory = vi.fn();

function Harness({ canUndo = true, canRedo = true }: HarnessProps) {
  useHistoryShortcuts({ canUndo, canRedo, undo, redo });

  useKeyboardShortcut({
    code: "Slash",
    onTrigger: () => {
      document.querySelector<HTMLInputElement>("[data-formula-input]")?.focus();
    },
  });

  useKeyboardShortcut({
    code: "Backspace",
    shift: true,
    onTrigger: clearFormula,
  });

  useKeyboardShortcut({
    code: "Digit1",
    shift: true,
    onTrigger: toggleSets,
  });

  useKeyboardShortcut({
    code: "Digit2",
    shift: true,
    onTrigger: toggleRegions,
  });

  useKeyboardShortcut({
    code: "Digit3",
    shift: true,
    onTrigger: toggleHistory,
  });

  return <input aria-label="Fórmula" data-formula-input />;
}

function press(
  code: string,
  options: KeyboardEventInit = {},
  target: EventTarget = window,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    code,
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    ...options,
  });

  act(() => {
    target.dispatchEvent(event);
  });

  return event;
}

describe("Atajos de teclado", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let mounted: boolean;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mounted = true;

    act(() => {
      root.render(<Harness />);
    });
  });

  afterEach(() => {
    if (mounted) {
      act(() => {
        root.unmount();
      });
    }

    container.remove();
    vi.unstubAllGlobals();
  });

  it.each(["ctrlKey", "metaKey"] as const)("deshace y rehace con %s", (modifier) => {
    const modifiers = {
      ctrlKey: modifier === "ctrlKey",
      metaKey: modifier === "metaKey",
    };

    expect(press("KeyZ", modifiers).defaultPrevented).toBe(true);
    expect(undo).toHaveBeenCalledTimes(1);

    press("KeyZ", { ...modifiers, shiftKey: true });
    press("KeyY", modifiers);

    expect(redo).toHaveBeenCalledTimes(2);
  });

  it("respeta el historial vacío", () => {
    act(() => {
      root.render(<Harness canUndo={false} canRedo={false} />);
    });

    expect(press("KeyZ").defaultPrevented).toBe(false);
    expect(press("KeyZ", { shiftKey: true }).defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it("enfoca el editor de fórmula", () => {
    press("Slash");

    expect(document.activeElement).toBe(container.querySelector("[data-formula-input]"));
  });

  it("ejecuta limpiar fórmula con el modificador correcto", () => {
    press("Backspace");
    expect(clearFormula).not.toHaveBeenCalled();

    press("Backspace", { shiftKey: true });
    expect(clearFormula).toHaveBeenCalledTimes(1);
  });

  it.each(["ctrlKey", "metaKey"] as const)("activa los paneles con %s", (modifier) => {
    const modifiers = {
      ctrlKey: modifier === "ctrlKey",
      metaKey: modifier === "metaKey",
      shiftKey: true,
    };

    press("Digit1", modifiers);
    press("Digit2", modifiers);
    press("Digit3", modifiers);

    expect(toggleSets).toHaveBeenCalledTimes(1);
    expect(toggleRegions).toHaveBeenCalledTimes(1);
    expect(toggleHistory).toHaveBeenCalledTimes(1);
  });

  it.each(["input", "textarea", "select"] as const)(
    "no intercepta atajos dentro de %s",
    (tagName) => {
      const field = document.createElement(tagName);
      container.append(field);

      expect(press("KeyZ", {}, field).defaultPrevented).toBe(false);
      press("Backspace", { shiftKey: true }, field);
      press("Digit1", { shiftKey: true }, field);
      press("Slash", {}, field);

      expect(undo).not.toHaveBeenCalled();
      expect(clearFormula).not.toHaveBeenCalled();
      expect(toggleSets).not.toHaveBeenCalled();
      expect(document.activeElement).not.toBe(container.querySelector("[data-formula-input]"));
    },
  );

  it("ignora descendientes de un editor de texto", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");

    const child = document.createElement("span");
    editable.append(child);
    container.append(editable);

    expect(press("KeyZ", {}, child).defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();
  });

  it("ignora campos con role textbox", () => {
    const editable = document.createElement("div");
    editable.setAttribute("role", "textbox");
    container.append(editable);

    press("KeyZ", {}, editable);

    expect(undo).not.toHaveBeenCalled();
  });

  it.each([
    { ctrlKey: false, metaKey: false },
    { altKey: true },
    { isComposing: true },
    { repeat: true },
  ])("ignora eventos no válidos: %j", (options) => {
    expect(press("KeyZ", options).defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();
  });

  it("respeta eventos ya manejados", () => {
    const event = new KeyboardEvent("keydown", {
      code: "KeyZ",
      ctrlKey: true,
      cancelable: true,
    });

    event.preventDefault();

    act(() => {
      window.dispatchEvent(event);
    });

    expect(undo).not.toHaveBeenCalled();
  });

  it("retira los listeners al desmontar", () => {
    act(() => {
      root.unmount();
    });
    mounted = false;

    press("KeyZ");
    press("Backspace", { shiftKey: true });
    press("Digit1", { shiftKey: true });

    expect(undo).not.toHaveBeenCalled();
    expect(clearFormula).not.toHaveBeenCalled();
    expect(toggleSets).not.toHaveBeenCalled();
  });
});
