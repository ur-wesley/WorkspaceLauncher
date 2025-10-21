import { useKeyDownList } from "@solid-primitives/keyboard";
import { createEffect, createSignal, onCleanup } from "solid-js";

let dialogOpenCount = 0;

export function notifyDialogOpened() {
  dialogOpenCount++;
  console.debug("[hotkeys] dialog opened, count:", dialogOpenCount);
}

export function notifyDialogClosed() {
  dialogOpenCount = Math.max(0, dialogOpenCount - 1);
  console.debug("[hotkeys] dialog closed, count:", dialogOpenCount);
}

function isAnyDialogOpen(): boolean {
  return dialogOpenCount > 0;
}

export type HotkeyId =
  | "openCommander"
  | "createWorkspace"
  | "createAction"
  | "createVariable"
  | "focusSearch"
  | "runAll"
  | "stopAll"
  | "navigateDashboard"
  | "navigateSettings"
  | "openActiveActionsManager"
  | "toggleSidebar";

export type HotkeyBinding = { keys: string[] };
export type HotkeyMap = Record<HotkeyId, HotkeyBinding>;

const STORAGE_KEY = "workspace-launcher:hotkeys";

const defaultBindings: HotkeyMap = {
  openCommander: { keys: ["Control", "k"] },
  createWorkspace: { keys: ["Control", "n"] },
  createAction: { keys: ["Control", "Shift", "a"] },
  createVariable: { keys: ["Control", "Shift", "v"] },
  focusSearch: { keys: ["Control", "f"] },
  runAll: { keys: ["Control", "Enter"] },
  stopAll: { keys: ["Control", "x"] },
  navigateDashboard: { keys: ["Control", "Shift", "d"] },
  navigateSettings: { keys: ["Control", "Shift", "s"] },
  openActiveActionsManager: { keys: ["Control", "Shift", "t"] },
  toggleSidebar: { keys: ["Control", "b"] },
};

export type HotkeyContext = "global" | "workspaceDetail" | "workspacesList";

export function loadBindings(): HotkeyMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBindings;
    const parsed = JSON.parse(raw) as Partial<HotkeyMap>;
    return { ...defaultBindings, ...parsed } as HotkeyMap;
  } catch {
    return defaultBindings;
  }
}

export function saveBindings(bindings: HotkeyMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

function normalizeKeyName(key: string): string {
  let normalized = key;

  if (key.startsWith("Key") && key.length === 4) normalized = key.slice(3).toLowerCase();
  else if (key.startsWith("Digit") && key.length === 6) normalized = key.slice(5);
  else if (key.startsWith("Numpad") && key.length > 6) normalized = key.slice(6);
  else if (key.length === 1) normalized = key.toLowerCase();
  else if (key.toLowerCase().includes("control")) normalized = "Control";
  else if (key.toUpperCase() === "CTRL") normalized = "Control";
  else if (key.toLowerCase().includes("shift")) normalized = "Shift";
  else if (key.toLowerCase().includes("alt")) normalized = "Alt";
  else if (key.toLowerCase().includes("meta")) normalized = "Meta";
  else if (key.toLowerCase() === "enter") normalized = "Enter";
  else if (key === "Slash") normalized = "/";

  return normalized;
}

function matchCombo(pressedRaw: Set<string>, combo: string[]): boolean {
  const pressed = new Set<string>();
  for (const key of pressedRaw) {
    pressed.add(normalizeKeyName(key));
  }
  if (pressed.size !== combo.length) return false;
  for (const key of combo) if (!pressed.has(key)) return false;
  return true;
}

export function useHotkeys(ctx: HotkeyContext, handlers: Partial<Record<HotkeyId, () => void>>) {
  console.debug("[hotkeys] init", { ctx, handlers: Object.keys(handlers) });

  let pressed: () => string[];
  try {
    const keyDownList = useKeyDownList();
    pressed = keyDownList;
  } catch (_error) {
    const [pressedKeys, setPressedKeys] = createSignal<string[]>([]);
    pressed = pressedKeys;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = normalizeKeyName(e.key);
      setPressedKeys((prev) => {
        if (!prev.includes(key)) {
          return [...prev, key];
        }
        return prev;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKeyName(e.key);
      setPressedKeys((prev) => prev.filter((k) => k !== key));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    });
  }

  const getBindings = () => loadBindings();

  const handle = () => {
    const current = new Set(pressed().map((k) => normalizeKeyName(k)));
    console.debug("[hotkeys] pressed", Array.from(current));
    if (current.size === 0) return;

    if (isAnyDialogOpen() && matchCombo(current, ["Control", "s"])) {
      console.debug("[hotkeys] Ctrl+S in dialog - submitting form");

      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 0) {
        const activeDialog = dialogs[dialogs.length - 1];

        const buttons = activeDialog.querySelectorAll(
          'button[type="submit"], button:not([type="button"]):not([aria-label*="Close"])',
        );
        if (buttons.length > 0) {
          const submitButton = buttons[buttons.length - 1] as HTMLButtonElement;
          if (!submitButton.disabled) {
            submitButton.click();
            console.debug("[hotkeys] Clicked submit button in dialog");
          }
        }
      }
      return;
    }

    if (isAnyDialogOpen()) {
      console.debug("[hotkeys] skipping - dialog is open");
      return;
    }

    const bindings = getBindings();

    const tryInvoke = (id: HotkeyId) => {
      const binding = bindings[id];
      if (!binding) return false;
      const matched = matchCombo(current, binding.keys);
      if (matched) {
        console.debug("[hotkeys] match -> invoke", { id, keys: binding.keys });
        handlers[id]?.();
        return true;
      }
      console.debug("[hotkeys] no-match", { id, need: binding.keys, have: Array.from(current) });
      return false;
    };

    if (tryInvoke("openCommander")) return;
    if (tryInvoke("createWorkspace")) return;
    if (tryInvoke("navigateDashboard")) return;
    if (tryInvoke("navigateSettings")) return;
    if (tryInvoke("openActiveActionsManager")) return;
    if (tryInvoke("toggleSidebar")) return;

    if (ctx === "workspaceDetail") {
      if (tryInvoke("createAction")) return;
      if (tryInvoke("createVariable")) return;
      if (tryInvoke("focusSearch")) return;
      if (tryInvoke("runAll")) return;
      if (tryInvoke("stopAll")) return;
    }

    if (ctx === "workspacesList") {
      if (tryInvoke("createWorkspace")) return;
      if (tryInvoke("focusSearch")) return;
    }
  };

  const preventIfMatched = (event: KeyboardEvent) => {
    const bindings = loadBindings();
    const current = new Set(pressed().map((k) => normalizeKeyName(k)));
    current.add(normalizeKeyName(event.key));

    if (isAnyDialogOpen() && matchCombo(current, ["Control", "s"])) {
      console.debug("[hotkeys] preventing Ctrl+S default (browser save)");
      event.preventDefault();
      return;
    }

    if (isAnyDialogOpen()) {
      return;
    }
    const relevant: HotkeyId[] = [
      "openCommander",
      "createWorkspace",
      "navigateDashboard",
      "navigateSettings",
      "openActiveActionsManager",
      ...(ctx === "workspaceDetail"
        ? [
          "createAction" as HotkeyId,
          "createVariable" as HotkeyId,
          "import" as HotkeyId,
          "share" as HotkeyId,
          "focusSearch" as HotkeyId,
          "runAll" as HotkeyId,
          "stopAll" as HotkeyId,
        ]
        : ([] as HotkeyId[])),
      ...(ctx === "workspacesList" ? (["focusSearch"] as HotkeyId[]) : ([] as HotkeyId[])),
    ];
    for (const id of relevant) {
      const binding = bindings[id];
      if (binding && matchCombo(current, binding.keys)) {
        console.debug("[hotkeys] prevent default", { id, combo: binding.keys });
        event.preventDefault();
        break;
      }
    }

    const ctrl = current.has("Control");
    if (ctrl) {
      const blockCombos: string[][] = [
        ["Control", "p"],
        ["Control", "s"],
        ["Control", "f"],
      ];
      for (const combo of blockCombos) {
        if (matchCombo(current, combo)) {
          console.debug("[hotkeys] prevent default (browser)", { combo });
          event.preventDefault();
          break;
        }
      }
    }
  };

  createEffect(() => {
    void pressed();
    handle();
  });

  window.addEventListener("keydown", preventIfMatched, { capture: true });
  onCleanup(() => window.removeEventListener("keydown", preventIfMatched, { capture: true }));
}
