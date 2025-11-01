interface Technology {
	name: string;
	icon: string;
	description: string;
	gradient: string;
	borderColor: string;
	url?: string;
}

const technologies: Technology[] = [
	{
		name: "SolidJS",
		icon: "⚡",
		description: "Reactive framework for blazing-fast performance",
		gradient: "from-blue-500 to-blue-600",
		borderColor: "border-blue-500/50",
		url: "https://www.solidjs.com",
	},
	{
		name: "Tauri",
		icon: "🪟",
		description: "Lightweight desktop apps with native performance",
		gradient: "from-blue-600 to-indigo-600",
		borderColor: "border-blue-600/50",
		url: "https://tauri.app",
	},
	{
		name: "TypeScript",
		icon: "📘",
		description: "Type-safe development for better code quality",
		gradient: "from-blue-400 to-blue-500",
		borderColor: "border-blue-400/50",
		url: "https://www.typescriptlang.org",
	},
	{
		name: "SQLite",
		icon: "🗄️",
		description: "Embedded database for reliable data storage",
		gradient: "from-blue-700 to-indigo-700",
		borderColor: "border-blue-700/50",
		url: "https://www.sqlite.org",
	},
	{
		name: "UnoCSS",
		icon: "🎨",
		description: "Instant utility-first CSS with zero runtime",
		gradient: "from-primary-500 to-primary-600",
		borderColor: "border-primary-500/50",
		url: "https://unocss.dev",
	},
	{
		name: "Bun",
		icon: "🍞",
		description: "Ultra-fast JavaScript runtime and toolkit",
		gradient: "from-yellow-500 to-orange-500",
		borderColor: "border-yellow-500/50",
		url: "https://bun.sh",
	},
];

const TechStack = () => {
	return (
		<section class="relative py-32 bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden">
			<div class="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-blue-500/5"></div>
			<div class="absolute inset-0 overflow-hidden">
				<div class="absolute top-1/4 right-0 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
				<div class="absolute bottom-1/4 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
			</div>
			<div class="section-container relative z-10">
				<div class="text-center mb-20">
					<h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
						Built with <span class="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">Modern Tech</span>
					</h2>
					<p class="text-xl text-gray-400 max-w-2xl mx-auto">
						Leveraging cutting-edge technologies for performance, reliability, and an exceptional user experience
					</p>
				</div>
				<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{technologies.map((tech) => {
						const content = (
							<div
								class={`group relative bg-gray-900/50 border ${tech.borderColor} rounded-xl p-6 hover:border-opacity-100 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1 cursor-pointer`}
							>
								<div class={`absolute inset-0 bg-gradient-to-br ${tech.gradient} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`}></div>
								<div class="relative">
									<div class="flex items-center gap-4 mb-3">
										<div class="text-4xl">{tech.icon}</div>
										<h3 class="text-xl font-bold text-white">{tech.name}</h3>
									</div>
									<p class="text-gray-400 leading-relaxed text-sm">{tech.description}</p>
								</div>
							</div>
						);

						return tech.url ? (
							<a href={tech.url} target="_blank" rel="noopener noreferrer" class="block">
								{content}
							</a>
						) : (
							content
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default TechStack;
