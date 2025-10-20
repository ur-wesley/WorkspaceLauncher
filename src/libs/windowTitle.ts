export async function setAppWindowTitle(title?: string): Promise<void> {
 const windowTitle = title
  ? `${title} - WorkspaceLauncher`
  : "WorkspaceLauncher";
 try {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setTitle(windowTitle);
 } catch (error) {
  console.warn("Failed to set Tauri window title", error);
 }
 document.title = windowTitle;
}
