interface Feature {
	icon: string;
	title: string;
	description: string;
}

const features: Feature[] = [
	{
		icon: "📦",
		title: "Workspace Management",
		description:
			"Organize all your environments and workflows in one place. Create custom workspaces for any scenario—development, gaming, productivity, and more.",
	},
	{
		icon: "⚡",
		title: "One-Click Launch",
		description:
			"Execute multiple actions simultaneously. Launch apps, connect to servers, open URLs, run commands—all with a single click.",
	},
	{
		icon: "🔧",
		title: "Tool Templates",
		description:
			"Create reusable configurations with placeholders and variables. Share settings across workspaces or with your team.",
	},
	{
		icon: "📊",
		title: "Process Tracking",
		description: "Monitor running processes in real-time. View execution history and track what's currently active.",
	},
	{
		icon: "🔄",
		title: "Import & Export",
		description:
			"Share your workspace configurations via JSON files or clipboard. Collaborate and sync across devices.",
	},
	{
		icon: "🎨",
		title: "Customizable Themes",
		description:
			"Personalize your interface with custom themes. Choose from light mode, dark mode, or create your own.",
	},
];

const Features = () => {
	return (
		<section
			id="features"
			class="relative min-h-screen lg:h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden py-20"
		>
			<div class="absolute inset-0 overflow-hidden">
				<div class="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
				<div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float animation-delay-2000"></div>
				<div class="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
			</div>
			<div class="section-container relative z-10 w-full">
				<div class="text-center mb-16">
					<h2 class="text-5xl md:text-6xl font-bold text-white mb-6">
						Powerful{" "}
						<span class="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">Features</span>
					</h2>
					<p class="text-2xl text-gray-300 max-w-3xl mx-auto">Everything you need to streamline your daily workflows</p>
				</div>
				<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
					{features.map((feature) => (
						<div class="group bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-primary-500 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2 hover:bg-gray-900/80">
							<div class="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
							<h3 class="text-2xl font-bold text-white mb-4 group-hover:text-primary-400 transition-colors">
								{feature.title}
							</h3>
							<p class="text-gray-400 leading-relaxed text-lg group-hover:text-gray-300 transition-colors">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default Features;
