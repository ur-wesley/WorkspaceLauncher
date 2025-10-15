import type { Component } from "solid-js";
import { For, createEffect, createSignal, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
 TextField,
 TextFieldLabel,
 TextFieldRoot,
} from "@/components/ui/textfield";
import {
 loadBindings,
 saveBindings,
 type HotkeyId,
 type HotkeyMap,
} from "@/libs/hotkeys";

const LABELS: Record<HotkeyId, string> = {
 openCommander: "Open Commander",
 createWorkspace: "Create Workspace",
 createAction: "Create Action",
 createVariable: "Create Variable",
 focusSearch: "Focus Search",
 runAll: "Run All Actions",
 stopAll: "Stop All Actions",
 navigateDashboard: "Go to Dashboard",
 navigateSettings: "Go to Settings",
 openActiveActionsManager: "Open Active Actions Manager",
};

export const SettingsHotkeysPage: Component = () => {
 const [bindings, setBindings] = createSignal<HotkeyMap>(loadBindings());
 const [recording, setRecording] = createSignal<HotkeyId | null>(null);
 const [downKeys, setDownKeys] = createSignal<Set<string>>(new Set());
 const [comboKeys, setComboKeys] = createSignal<Set<string>>(new Set());

 const startRecording = (id: HotkeyId) => {
  setDownKeys(new Set());
  setComboKeys(new Set());
  setRecording(id);
 };

 const stopRecording = () => {
  setDownKeys(new Set());
  setComboKeys(new Set());
  setRecording(null);
 };

 createEffect(() => {
  const current = recording();
  if (!current) return;
  const normalizeKey = (key: string) => key;
  const handleKeyDown = (e: KeyboardEvent) => {
   if (e.key === "Escape") {
    e.preventDefault();
    stopRecording();
    return;
   }
   e.preventDefault();
   const key = normalizeKey(e.key);
   setDownKeys((prev) => {
    const next = new Set(prev);
    next.add(key);
    return next;
   });
   setComboKeys((prev) => {
    const next = new Set(prev);
    if (e.ctrlKey) next.add("Control");
    if (e.shiftKey) next.add("Shift");
    if (e.altKey) next.add("Alt");
    if (e.metaKey) next.add("Meta");
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) next.add(key);
    return next;
   });
  };
  const handleKeyUp = (e: KeyboardEvent) => {
   e.preventDefault();
   const key = normalizeKey(e.key);
   setDownKeys((prev) => {
    const next = new Set(prev);
    next.delete(key);
    if (next.size === 0) {
     const combo = Array.from(comboKeys());
     if (combo.length > 0) {
      const updated = {
       ...bindings(),
       [current]: { keys: combo },
      } as HotkeyMap;
      setBindings(updated);
      saveBindings(updated);
     }
     stopRecording();
    }
    return next;
   });
  };
  const handleBlur = () => stopRecording();
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleBlur);
  onCleanup(() => {
   window.removeEventListener("keydown", handleKeyDown);
   window.removeEventListener("keyup", handleKeyUp);
   window.removeEventListener("blur", handleBlur);
  });
 });

 return (
  <div class="h-full w-full flex flex-col">
   <div class="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
    <A href="/settings">
     <Button variant="outline">
      <div class="i-mdi-arrow-left w-4 h-4 mr-2" /> Back
     </Button>
    </A>
    <div class="text-right">
     <h1 class="text-2xl font-bold">Hotkeys</h1>
     <p class="text-sm text-muted-foreground">Customize keyboard shortcuts</p>
    </div>
   </div>
   <div class="flex-1 overflow-y-auto px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 space-y-4">
    <Card>
     <CardHeader>
      <CardTitle>Bindings</CardTitle>
     </CardHeader>
     <CardContent class="space-y-3">
      <For each={Object.keys(LABELS) as HotkeyId[]}>
       {(id) => (
        <TextFieldRoot>
         <TextFieldLabel>{LABELS[id]}</TextFieldLabel>
         <div class="flex gap-2">
          <TextField
           value={
            recording() === id
             ? Array.from(comboKeys()).join(" + ")
             : bindings()[id].keys.join(" + ")
           }
           readOnly
           class="flex-1"
          />
          <Button
           onClick={() => startRecording(id)}
           disabled={Boolean(recording()) && recording() !== id}
          >
           {recording() === id ? "Press keys... (Esc to cancel)" : "Rebind"}
          </Button>
         </div>
        </TextFieldRoot>
       )}
      </For>
      <div>
       <Button
        variant="outline"
        onClick={() => {
         const loaded = loadBindings();
         setBindings(loaded);
        }}
       >
        Restore From Storage
       </Button>
      </div>
     </CardContent>
    </Card>
   </div>
  </div>
 );
};
