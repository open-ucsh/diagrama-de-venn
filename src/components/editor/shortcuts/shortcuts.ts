export type Platform = "windows" | "mac";

type ShortcutKey =
  | "modifier"
  | "shift"
  | "backspace"
  | "enter"
  | "space"
  | "escape"
  | "home"
  | "end"
  | "up"
  | "down"
  | "Z"
  | "Y"
  | "/"
  | "1"
  | "2"
  | "3";

export interface Shortcut {
  label: string;
  combinations: readonly (readonly ShortcutKey[])[];
}

interface GlobalShortcut extends Shortcut {
  code: string;
  shift: boolean;
}

interface ShortcutGroup {
  title: string;
  shortcuts: readonly Shortcut[];
}

export const SHORTCUTS = {
  undo: {
    label: "Deshacer",
    code: "KeyZ",
    shift: false,
    combinations: [["modifier", "Z"]],
  },
  redo: {
    label: "Rehacer",
    code: "KeyZ",
    shift: true,
    combinations: [["modifier", "shift", "Z"]],
  },
  redoAlternative: {
    label: "Rehacer",
    code: "KeyY",
    shift: false,
    combinations: [["modifier", "Y"]],
  },
  focusFormula: {
    label: "Enfocar fórmula",
    code: "Slash",
    shift: false,
    combinations: [["modifier", "/"]],
  },
  clearFormula: {
    label: "Limpiar fórmula",
    code: "Backspace",
    shift: true,
    combinations: [["modifier", "shift", "backspace"]],
  },
  toggleSets: {
    label: "Conjuntos",
    code: "Digit1",
    shift: true,
    combinations: [["modifier", "shift", "1"]],
  },
  toggleRegions: {
    label: "Regiones",
    code: "Digit2",
    shift: true,
    combinations: [["modifier", "shift", "2"]],
  },
  toggleHistory: {
    label: "Historial",
    code: "Digit3",
    shift: true,
    combinations: [["modifier", "shift", "3"]],
  },
} as const satisfies Record<string, GlobalShortcut>;

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: "Edición",
    shortcuts: [SHORTCUTS.undo, SHORTCUTS.redo, SHORTCUTS.focusFormula, SHORTCUTS.clearFormula],
  },
  {
    title: "Paneles",
    shortcuts: [SHORTCUTS.toggleSets, SHORTCUTS.toggleRegions, SHORTCUTS.toggleHistory],
  },
  {
    title: "Navegación",
    shortcuts: [
      {
        label: "Recorrer regiones",
        combinations: [["up"], ["down"]],
      },
      {
        label: "Primera / última",
        combinations: [["home"], ["end"]],
      },
      {
        label: "Seleccionar región",
        combinations: [["enter"], ["space"]],
      },
      {
        label: "Cerrar regiones / historial",
        combinations: [["escape"]],
      },
    ],
  },
];

interface KeyPresentation {
  label: string;
  description: string;
}

const KEY_PRESENTATIONS: Record<Exclude<ShortcutKey, "modifier">, KeyPresentation> = {
  shift: { label: "⇧", description: "Shift" },
  backspace: { label: "⌫", description: "Retroceso" },
  enter: { label: "↵", description: "Enter" },
  space: { label: "Espacio", description: "Espacio" },
  escape: { label: "Esc", description: "Escape" },
  home: { label: "Inicio", description: "Inicio" },
  end: { label: "Fin", description: "Fin" },
  up: { label: "↑", description: "Flecha arriba" },
  down: { label: "↓", description: "Flecha abajo" },
  Z: { label: "Z", description: "Z" },
  Y: { label: "Y", description: "Y" },
  "/": { label: "/", description: "/" },
  "1": { label: "1", description: "1" },
  "2": { label: "2", description: "2" },
  "3": { label: "3", description: "3" },
};

const MODIFIER_PRESENTATIONS: Record<Platform, KeyPresentation> = {
  windows: { label: "Ctrl", description: "Control" },
  mac: { label: "⌘", description: "Command" },
};

export function getKeyPresentation(key: ShortcutKey, platform: Platform): KeyPresentation {
  return key === "modifier" ? MODIFIER_PRESENTATIONS[platform] : KEY_PRESENTATIONS[key];
}
