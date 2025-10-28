import { useSearchParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createSignal } from "solid-js";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { ThemesSettings } from "@/components/settings/ThemesSettings";
import { ToolsSettings } from "@/components/settings/ToolsSettings";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SettingsPage: Component = () => {
	const [searchParams] = useSearchParams();
	const [activeTab, setActiveTab] = createSignal("general");

	createEffect(() => {
		const tab = searchParams.tab;
		if (!tab) {
			return;
		}

		const normalized = Array.isArray(tab) ? (tab[0] ?? "general") : tab === "advanced" ? "general" : tab;

		setActiveTab(normalized);
	});

	return (
		<div class="container mx-auto py-6">
			<div class="max-w-4xl">
				<div class="mb-6">
					<h1 class="text-3xl font-bold">Settings</h1>
					<p class="text-muted-foreground">Manage your application preferences and configuration</p>
				</div>

				<Tabs value={activeTab()} onChange={setActiveTab} class="w-full">
					<TabsList class="grid w-full grid-cols-4">
						<TabsTrigger value="general">General</TabsTrigger>
						<TabsTrigger value="appearance">Appearance</TabsTrigger>
						<TabsTrigger value="themes">Themes</TabsTrigger>
						<TabsTrigger value="tools">Tools</TabsTrigger>
						<TabsIndicator />
					</TabsList>

					<TabsContent value="general" class="space-y-4">
						<GeneralSettings />
					</TabsContent>

					<TabsContent value="appearance" class="space-y-4">
						<AppearanceSettings />
					</TabsContent>

					<TabsContent value="themes" class="space-y-4">
						<ThemesSettings />
					</TabsContent>

					<TabsContent value="tools" class="space-y-4">
						<ToolsSettings />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
};
