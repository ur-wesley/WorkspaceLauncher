import { A } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, For } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useThemeStore } from "@/store/theme";

export const ThemesSettings: Component = () => {
	const [themeStore, themeActions] = useThemeStore();
	const [expandedThemes, setExpandedThemes] = createSignal<Set<number>>(new Set());

	const toggleTheme = (themeId: number) => {
		const newSet = new Set(expandedThemes());
		if (newSet.has(themeId)) {
			newSet.delete(themeId);
		} else {
			newSet.add(themeId);
		}
		setExpandedThemes(newSet);
	};

	const getThemeColor = (theme: { dark_colors: string; light_colors: string }, isDark: boolean) => {
		try {
			const colors = JSON.parse(isDark ? theme.dark_colors : theme.light_colors) as Record<string, string>;
			return colors.primary || "#3b82f6";
		} catch {
			return "#3b82f6";
		}
	};

	return (
		<div class="space-y-4">
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Theme Library</CardTitle>
							<CardDescription>Manage and customize color themes</CardDescription>
						</div>
						<A href="/settings/themes/create">
							<Button>
								<div class="i-mdi-plus w-4 h-4 mr-2" />
								Add Theme
							</Button>
						</A>
					</div>
				</CardHeader>
				<CardContent>
					<div class="space-y-2">
						<For each={themeStore.themes}>
							{(theme) => (
								<Collapsible open={expandedThemes().has(theme.id)} onOpenChange={() => toggleTheme(theme.id)}>
									<CollapsibleTrigger as="div">
										<div class="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
											<div class="flex items-center gap-3">
												<div
													class="w-4 h-4 rounded-full border"
													style={{ "background-color": getThemeColor(theme, false) }}
												/>
												<div>
													<p class="font-medium">{theme.name}</p>
													<p class="text-sm text-muted-foreground">{theme.description}</p>
												</div>
											</div>
											<div class="flex items-center gap-2">
												{theme.is_predefined && <Badge variant="secondary">Built-in</Badge>}
												{themeStore.activeTheme?.id === theme.id && <Badge variant="default">Active</Badge>}
												<div class="i-mdi-chevron-down w-4 h-4" />
											</div>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div class="p-3 border-t bg-muted/30">
											<div class="flex items-center gap-2">
												<Button
													size="sm"
													onClick={() => themeActions.activateTheme(theme.id)}
													disabled={themeStore.activeTheme?.id === theme.id}
												>
													<div class="i-mdi-check w-4 h-4 mr-1" />
													{themeStore.activeTheme?.id === theme.id ? "Active" : "Activate"}
												</Button>
												{!theme.is_predefined && (
													<>
														<A href={`/settings/themes/edit?id=${theme.id}`}>
															<Button size="sm" variant="outline">
																<div class="i-mdi-pencil w-4 h-4 mr-1" />
																Edit
															</Button>
														</A>
														<Button size="sm" variant="destructive" onClick={() => themeActions.deleteTheme(theme.id)}>
															<div class="i-mdi-delete w-4 h-4 mr-1" />
															Delete
														</Button>
													</>
												)}
											</div>
										</div>
									</CollapsibleContent>
								</Collapsible>
							)}
						</For>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
