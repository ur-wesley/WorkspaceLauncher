export function fuzzyMatch(text: string, query: string): boolean {
 const t = text.toLowerCase();
 const q = query.toLowerCase();
 let qi = 0;
 for (let i = 0; i < t.length && qi < q.length; i++) {
  if (t[i] === q[qi]) qi++;
 }
 return qi === q.length;
}

export function getStoredTab(workspaceId: number): string {
 try {
  return localStorage.getItem(`workspace-${workspaceId}-tab`) || "actions";
 } catch {
  return "actions";
 }
}

export function setStoredTab(workspaceId: number, tab: string): void {
 try {
  localStorage.setItem(`workspace-${workspaceId}-tab`, tab);
 } catch {}
}

interface ActionConfig {
 tool_name?: string;
 placeholder_values?: Record<string, string>;
}

export function parseActionConfig(configJson: string): {
 toolName: string;
 commandPreview: string;
} {
 try {
  const config = JSON.parse(configJson) as ActionConfig;
  const toolName = config.tool_name || "Unknown";
  let commandPreview = "";

  if (config.placeholder_values) {
   commandPreview = Object.entries(config.placeholder_values)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(", ");
  }

  return { toolName, commandPreview };
 } catch {
  return { toolName: "Unknown", commandPreview: "" };
 }
}

export function isInteractiveTarget(target: HTMLElement | null): boolean {
 if (!target) return false;

 const tag = target.tagName;
 const isEditable = target.isContentEditable;
 const inDialog = !!target.closest('[role="dialog"]');
 const interactiveTags: readonly string[] = [
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
 ];

 return isEditable || interactiveTags.includes(tag) || inDialog;
}

export function getNextTab(
 currentTab: string,
 direction: "forward" | "backward"
): string {
 const order = ["actions", "variables", "running", "history"];
 const idx = order.indexOf(currentTab);
 if (idx === -1) return currentTab;

 if (direction === "backward") {
  return order[(idx - 1 + order.length) % order.length];
 }
 return order[(idx + 1) % order.length];
}
