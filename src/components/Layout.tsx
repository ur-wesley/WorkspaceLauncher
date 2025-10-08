import type { JSX, ParentComponent } from "solid-js";
import { createSignal } from "solid-js";
import { Sidebar } from "@/components/Sidebar";

interface LayoutProps {
	children?: JSX.Element;
}

export const Layout: ParentComponent<LayoutProps> = (props) => {
	const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);

	const toggleSidebar = () => {
		setSidebarCollapsed(!sidebarCollapsed());
	};

	return (
		<div class="flex h-screen bg-background overflow-hidden">
			{/* Sidebar */}
			<Sidebar collapsed={sidebarCollapsed()} onToggle={toggleSidebar} />

			{/* Main Content */}
			<div class="flex-1 flex flex-col overflow-hidden">
				{/* Main Content Area */}
				<main class="flex-1 overflow-y-auto">{props.children}</main>
			</div>
		</div>
	);
};
