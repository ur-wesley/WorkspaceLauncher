import { A, useNavigate, useSearchParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { DeleteToolDialog } from "@/components/DeleteToolDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { ToolDialog } from "@/components/ToolDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { autostartHandler } from "@/libs/autostart";
import { cn } from "@/libs/cn";
import { showToast } from "@/libs/toast";
import { checkForUpdates } from "@/libs/updater";
import { useThemeStore } from "@/store/theme";
import { useToolStore } from "@/store/tool";
import type { Tool } from "@/types/database";
import { version } from "../../package.json" with { type: "json" };

const AddToolTrigger = (props: { onClick?: () => void }) => (
	<Button onClick={props.onClick}>
		<div class="i-mdi-plus w-4 h-4 mr-2" />
		Add Tool
	</Button>
);

const EditToolTrigger = (props: { onClick?: () => void }) => (
	<button
		type="button"
		class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
		onClick={props.onClick}
	>
		<div class="flex items-center gap-2">
			<div class="i-mdi-pencil w-4 h-4" />
			Edit
		</div>
	</button>
);

const DeleteToolTrigger = (props: { onClick?: () => void }) => (
	<button
		type="button"
		class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
		onClick={props.onClick}
	>
		<div class="flex items-center gap-2">
			<div class="i-mdi-delete w-4 h-4" />
			Delete
		</div>
	</button>
);

export const SettingsPage: Component = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [toolStore, toolActions] = useToolStore();
	const [themeStore, themeActions] = useThemeStore();
	const [darkMode, setDarkMode] = createSignal(false);
	const [autoLaunch, setAutoLaunch] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal("general");

	let themeChangeTimeout: ReturnType<typeof setTimeout> | null = null;

	createEffect(() => {
		const tab = searchParams.tab;
		if (!tab) {
			return;
		}

		const normalized = Array.isArray(tab) ? (tab[0] ?? "general") : tab === "advanced" ? "general" : tab;

		setActiveTab(normalized);
	});

	onMount(() => {
		toolActions.loadTools();
		const isDark = document.documentElement.getAttribute("data-kb-theme") === "dark";
		setDarkMode(isDark);

		autostartHandler.isEnabled().then((enabled) => {
			setAutoLaunch(enabled);
		});
	});

	const handleToggleTool = async (toolId: number, enabled: boolean) => {
		await toolActions.toggleTool(toolId, enabled);
	};

	const toggleDarkMode = () => {
		const newMode = !darkMode();
		setDarkMode(newMode);
		document.documentElement.setAttribute("data-kb-theme", newMode ? "dark" : "light");
	};

	const toggleAutoLaunch = async (enabled: boolean) => {
		try {
			await autostartHandler.toggle(enabled);
			setAutoLaunch(enabled);
			showToast({
				title: enabled ? "Autostart enabled" : "Autostart disabled",
				description: enabled
					? "Application will start automatically when you log in"
					: "Application will not start automatically",
			});
		} catch (error) {
			showToast({
				title: "Failed to update autostart",
				description: error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
			setAutoLaunch(!enabled);
		}
	};

	const getToolTypeColor = (type: string) => {
		switch (type) {
			case "cli":
				return "bg-blue-500";
			case "binary":
				return "bg-orange-500";
			default:
				return "bg-gray-500";
		}
	};

	const groupedTools = () => {
		const groups: Record<string, Tool[]> = {};
		for (const tool of toolStore.tools) {
			const category = tool.category || "Other";
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(tool);
		}
		return groups;
	};

	const handleThemeChange = (value: string | null) => {
		if (value === null) {
			return;
		}

		const parsed = Number(value);
		if (Number.isNaN(parsed)) {
			return;
		}

		const currentThemeId = themeStore.activeTheme?.id;
		if (parsed === currentThemeId) {
			return;
		}

		if (themeChangeTimeout) {
			clearTimeout(themeChangeTimeout);
		}

		themeChangeTimeout = setTimeout(() => {
			void themeActions.activateTheme(parsed);
		}, 300);
	};

	return (
		<div class="h-full w-full flex flex-col">
			<div class="flex-1 px-4 py-4">
				<div class="flex items-center justify-between mb-6">
					<div>
						<h1 class="text-3xl font-bold">Settings</h1>
						<p class="text-muted-foreground">Configure application preferences and tools</p>
					</div>
				</div>

				<Tabs value={activeTab()} onChange={setActiveTab} class="w-full">
					<TabsList class="mb-4">
						<TabsTrigger value="general">
							<div class="i-mdi-cog w-4 h-4 mr-2" />
							General
						</TabsTrigger>
						<TabsTrigger value="appearance">
							<div class="i-mdi-palette w-4 h-4 mr-2" />
							Appearance
						</TabsTrigger>
						<TabsTrigger value="themes">
							<div class="i-mdi-brush w-4 h-4 mr-2" />
							Themes
						</TabsTrigger>
						<TabsTrigger value="tools">
							<div class="i-mdi-tools w-4 h-4 mr-2" />
							Tools
						</TabsTrigger>
						<TabsIndicator />
					</TabsList>

					<TabsContent value="general" class="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<div class="i-mdi-update w-5 h-5" />
									Updates
								</CardTitle>
								<CardDescription>Check for application updates</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium">Application Updates</p>
										<p class="text-sm text-muted-foreground">Current version: {version || "dev"}</p>
									</div>
									<Button onClick={() => checkForUpdates(false)}>
										<div class="i-mdi-update w-4 h-4 mr-2" />
										Check for Updates
									</Button>
								</div>

								<Separator />

								<div class="flex gap-2">
									<a
										href="https://github.com/ur-wesley/WorkspaceLauncher"
										target="_blank"
										rel="noreferrer"
										class="flex-1"
									>
										<Button variant="outline" class="w-full">
											<span class="iconify w-4 h-4 mr-2" data-icon="mdi:source-repository" />
											Repository
										</Button>
									</a>
									<a
										href="https://github.com/ur-wesley/WorkspaceLauncher/issues/new/choose"
										target="_blank"
										rel="noreferrer"
										class="flex-1"
									>
										<Button variant="outline" class="w-full">
											<span class="iconify w-4 h-4 mr-2" data-icon="mdi:github" />
											New Issue
										</Button>
									</a>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<span class="iconify w-5 h-5" data-icon="mdi:share-variant" />
									Share & Import
								</CardTitle>
								<CardDescription>Export your data to share with others or backup, and import data</CardDescription>
							</CardHeader>
							<CardContent class="space-y-3">
								<div class="flex items-start gap-3">
									<div class="flex-1 space-y-1">
										<p class="text-sm font-medium">Export Data</p>
										<p class="text-sm text-muted-foreground">
											Select and export workspaces and tools to a file or clipboard
										</p>
									</div>
									<ShareDialog
										trigger={(props) => (
											<Button onClick={props.onClick}>
												<span class="iconify w-4 h-4 mr-2" data-icon="mdi:export" />
												Export
											</Button>
										)}
									/>
								</div>

								<Separator />

								<div class="flex items-start gap-3">
									<div class="flex-1 space-y-1">
										<p class="text-sm font-medium">Import Data</p>
										<p class="text-sm text-muted-foreground">Import workspaces and tools from a file or clipboard</p>
									</div>
									<ImportDialog
										trigger={(props: { onClick?: () => void }) => (
											<Button variant="outline" onClick={props.onClick}>
												<span class="iconify w-4 h-4 mr-2" data-icon="mdi:import" />
												Import
											</Button>
										)}
									/>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="appearance" class="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<div class="i-mdi-theme-light-dark w-5 h-5" />
									Theme
								</CardTitle>
								<CardDescription>Customize the application appearance</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="space-y-1">
										<p class="text-sm font-medium">Dark Mode</p>
										<p class="text-sm text-muted-foreground">Toggle between light and dark mode</p>
									</div>
									<Switch checked={darkMode()} onChange={toggleDarkMode}>
										<SwitchControl>
											<SwitchThumb />
										</SwitchControl>
									</Switch>
								</div>

								<Separator />

								<div class="space-y-2">
									<label for="active-theme-select" class="text-sm font-medium">
										Active Theme
									</label>
									<Select
										id="active-theme-select"
										value={themeStore.activeTheme?.id.toString()}
										onChange={handleThemeChange}
										options={themeStore.themes.map((t) => t.id.toString())}
										placeholder="Select a theme"
										itemComponent={(props) => (
											<SelectItem item={props.item}>
												{themeStore.themes.find((t) => t.id.toString() === props.item.rawValue)?.name}
											</SelectItem>
										)}
									>
										<SelectTrigger>
											<SelectValue<string>>
												{(state) =>
													themeStore.themes.find((t) => t.id.toString() === state.selectedOption())?.name ||
													"Select theme"
												}
											</SelectValue>
										</SelectTrigger>
										<SelectContent />
									</Select>
									<p class="text-xs text-muted-foreground">{themeStore.activeTheme?.description || "No description"}</p>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<div class="i-mdi-cog w-5 h-5" />
									General
								</CardTitle>
								<CardDescription>Application preferences</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="space-y-1">
										<p class="text-sm font-medium">Auto-launch on startup</p>
										<p class="text-sm text-muted-foreground">Start with the system</p>
									</div>
									<Switch checked={autoLaunch()} onChange={toggleAutoLaunch}>
										<SwitchControl>
											<SwitchThumb />
										</SwitchControl>
									</Switch>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<div class="i-mdi-keyboard w-5 h-5" />
									Hotkeys
								</CardTitle>
								<CardDescription>Keyboard shortcuts configuration</CardDescription>
							</CardHeader>
							<CardContent>
								<A href="/settings/hotkeys">
									<Button variant="outline" class="w-full">
										<div class="i-mdi-keyboard-settings w-4 h-4 mr-2" />
										Configure Hotkeys
									</Button>
								</A>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="themes" class="space-y-4">
						<Card>
							<CardHeader>
								<div class="flex items-center justify-between">
									<div>
										<CardTitle>Theme Library</CardTitle>
										<CardDescription>Manage and create custom color themes</CardDescription>
									</div>
									<Button onClick={() => navigate("/settings/themes/create")}>
										<div class="i-mdi-plus w-4 h-4 mr-2" />
										Create Theme
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<Show
									when={!themeStore.isLoading && themeStore.themes.length > 0}
									fallback={
										<div class="text-center py-8 text-muted-foreground">
											<Show when={themeStore.isLoading}>
												<div class="i-mdi-loading animate-spin text-4xl mb-2" />
												<p>Loading themes...</p>
											</Show>
											<Show when={!themeStore.isLoading}>
												<div class="i-mdi-palette text-4xl mb-2" />
												<p>No themes available</p>
											</Show>
										</div>
									}
								>
									<div class="grid gap-3">
										<For each={themeStore.themes}>
											{(theme) => (
												<div class="flex items-center justify-between p-4 rounded-lg border bg-card">
													<div class="flex-1">
														<div class="flex items-center gap-2">
															<span class="font-medium">{theme.name}</span>
															<Show when={theme.is_predefined}>
																<Badge variant="secondary" class="text-xs">
																	Built-in
																</Badge>
															</Show>
															<Show when={theme.is_active}>
																<Badge class="text-xs bg-green-500">Active</Badge>
															</Show>
														</div>
														<Show when={theme.description}>
															<p class="text-sm text-muted-foreground mt-1">{theme.description}</p>
														</Show>
													</div>
													<div class="flex items-center gap-2">
														<Show when={!theme.is_active}>
															<Button variant="outline" size="sm" onClick={() => themeActions.activateTheme(theme.id)}>
																Activate
															</Button>
														</Show>
														<Show when={!theme.is_predefined}>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => navigate(`/settings/themes/edit?id=${theme.id}`)}
															>
																<div class="i-mdi-pencil w-4 h-4" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => themeActions.deleteTheme(theme.id)}
																disabled={theme.is_active}
															>
																<div class="i-mdi-delete w-4 h-4" />
															</Button>
														</Show>
													</div>
												</div>
											)}
										</For>
									</div>
								</Show>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="tools" class="space-y-4">
						<Card>
							<Collapsible defaultOpen>
								<CardHeader>
									<div class="flex justify-between items-center">
										<div class="flex items-center gap-2">
											<CollapsibleTrigger
												class="i-mdi-chevron-down w-5 h-5 transition-transform"
												aria-label="Toggle tools"
											/>
											<div>
												<CardTitle class="flex items-center gap-2">
													<div class="i-mdi-tools w-5 h-5" />
													Tool Management
												</CardTitle>
												<CardDescription>Manage tools that can be used to create actions</CardDescription>
											</div>
										</div>
										<ToolDialog trigger={AddToolTrigger} />
									</div>
								</CardHeader>
								<CollapsibleContent>
									<CardContent>
										<Show
											when={!toolStore.isLoading && toolStore.tools.length > 0}
											fallback={
												<div class="text-center py-8 text-muted-foreground">
													<Show when={toolStore.isLoading}>
														<div class="i-mdi-loading animate-spin text-4xl mb-2" />
														<p>Loading tools...</p>
													</Show>
													<Show when={!toolStore.isLoading}>
														<div class="i-mdi-tools text-4xl mb-2" />
														<p>No tools configured</p>
														<p class="text-sm">Add tools to simplify action creation</p>
													</Show>
												</div>
											}
										>
											<div class="space-y-4">
												{Object.entries(groupedTools())
													.filter(([_category, tools]) => tools.length > 0)
													.map(([category, tools]) => (
														<div class="space-y-2">
															<Show when={category !== "Other" || Object.keys(groupedTools()).length === 1}>
																<h3 class="text-lg font-medium capitalize">{category}</h3>
															</Show>
															<div class="grid gap-2">
																{tools.map((tool) => (
																	<div class="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 shadow-sm transition-all">
																		<div class="flex items-center gap-3">
																			<Show when={tool.icon}>
																				<div class="flex items-center justify-center w-10 h-10 rounded bg-primary text-primary-foreground">
																					<span
																						class="iconify w-5 h-5"
																						data-icon={`mdi:${tool.icon?.replace(/^i-mdi-/, "")}`}
																					/>
																				</div>
																			</Show>
																			<div class="flex-1">
																				<div class="flex items-center gap-2">
																					<span class="font-medium">{tool.name}</span>
																					<Badge
																						variant="secondary"
																						class={cn("text-white text-xs", getToolTypeColor(tool.tool_type))}
																					>
																						{tool.tool_type}
																					</Badge>
																					<Show when={!tool.enabled}>
																						<Badge variant="secondary" class="text-xs">
																							disabled
																						</Badge>
																					</Show>
																				</div>
																				<div class="text-sm text-muted-foreground">{tool.description}</div>
																				<div class="text-xs text-muted-foreground font-mono mt-1">{tool.template}</div>
																			</div>
																		</div>
																		<div class="flex items-center gap-3">
																			<div class="flex items-center gap-2">
																				<span class="text-sm text-muted-foreground">Enabled</span>
																				<Switch
																					checked={tool.enabled}
																					onChange={(checked) => handleToggleTool(tool.id, checked)}
																				>
																					<SwitchControl>
																						<SwitchThumb />
																					</SwitchControl>
																				</Switch>
																			</div>

																			<DropdownMenu>
																				<Tooltip>
																					<TooltipTrigger>
																						<DropdownMenuTrigger
																							as={Button}
																							variant="ghost"
																							size="sm"
																							class="h-8 w-8 p-0 opacity-60 hover:opacity-100"
																						>
																							<div class="i-mdi-dots-vertical w-4 h-4" />
																						</DropdownMenuTrigger>
																					</TooltipTrigger>
																					<TooltipContent>
																						<p>Tool Options</p>
																					</TooltipContent>
																				</Tooltip>
																				<DropdownMenuContent class="w-48">
																					<ToolDialog tool={tool} trigger={EditToolTrigger} />
																					<DropdownMenuSeparator />
																					<DeleteToolDialog tool={tool} trigger={DeleteToolTrigger} />
																				</DropdownMenuContent>
																			</DropdownMenu>
																		</div>
																	</div>
																))}
															</div>
														</div>
													))}
											</div>
										</Show>
									</CardContent>
								</CollapsibleContent>
							</Collapsible>
						</Card>
					</TabsContent>

					<TabsContent value="advanced" class="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<div class="i-mdi-update w-5 h-5" />
									Updates
								</CardTitle>
								<CardDescription>Check for application updates</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium">Application Updates</p>
										<p class="text-sm text-muted-foreground">Current version: {version || "dev"}</p>
									</div>
									<Button onClick={() => checkForUpdates(false)}>
										<div class="i-mdi-update w-4 h-4 mr-2" />
										Check for Updates
									</Button>
								</div>

								<Separator />

								<div class="flex gap-2">
									<a
										href="https://github.com/ur-wesley/WorkspaceLauncher"
										target="_blank"
										rel="noreferrer"
										class="flex-1"
									>
										<Button variant="outline" class="w-full">
											<span class="iconify w-4 h-4 mr-2" data-icon="mdi:source-repository" />
											Repository
										</Button>
									</a>
									<a
										href="https://github.com/ur-wesley/WorkspaceLauncher/issues/new/choose"
										target="_blank"
										rel="noreferrer"
										class="flex-1"
									>
										<Button variant="outline" class="w-full">
											<span class="iconify w-4 h-4 mr-2" data-icon="mdi:github" />
											New Issue
										</Button>
									</a>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle class="flex items-center gap-2">
									<span class="iconify w-5 h-5" data-icon="mdi:share-variant" />
									Share & Import
								</CardTitle>
								<CardDescription>Export your data to share with others or backup, and import data</CardDescription>
							</CardHeader>
							<CardContent class="space-y-3">
								<div class="flex items-start gap-3">
									<div class="flex-1 space-y-1">
										<p class="text-sm font-medium">Export Data</p>
										<p class="text-sm text-muted-foreground">
											Select and export workspaces and tools to a file or clipboard
										</p>
									</div>
									<ShareDialog
										trigger={(props) => (
											<Button onClick={props.onClick}>
												<span class="iconify w-4 h-4 mr-2" data-icon="mdi:export" />
												Export
											</Button>
										)}
									/>
								</div>

								<Separator />

								<div class="flex items-start gap-3">
									<div class="flex-1 space-y-1">
										<p class="text-sm font-medium">Import Data</p>
										<p class="text-sm text-muted-foreground">Import workspaces and tools from a file or clipboard</p>
									</div>
									<ImportDialog
										trigger={(props: { onClick?: () => void }) => (
											<Button variant="outline" onClick={props.onClick}>
												<span class="iconify w-4 h-4 mr-2" data-icon="mdi:import" />
												Import
											</Button>
										)}
									/>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
};
