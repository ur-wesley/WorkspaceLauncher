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
		<section class="relative min-h-screen lg:h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
			<div class="absolute inset-0 overflow-hidden">
				<div class="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-blue-500/10"></div>
				<div class="absolute top-1/3 right-1/4 w-[32rem] h-[32rem] bg-primary-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
				<div class="absolute bottom-1/3 left-1/4 w-[32rem] h-[32rem] bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float animation-delay-2000"></div>
				<div class="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/15 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float animation-delay-3000"></div>
				<div class="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
			</div>
			<div class="section-container relative z-10 py-16">
				<div class="text-center mb-16">
					<h2 class="text-5xl md:text-6xl font-bold text-white mb-6">
						Built with{" "}
						<span class="bg-gradient-to-r from-primary-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
							Modern Tech
						</span>
					</h2>
					<p class="text-2xl text-gray-300 max-w-3xl mx-auto">
						Leveraging cutting-edge technologies for performance, reliability, and an exceptional user experience
					</p>
				</div>
				<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
					{technologies.map((tech) => {
						const content = (
							<div
								class={`group relative bg-gray-900/60 backdrop-blur-sm border ${tech.borderColor} rounded-2xl p-8 hover:border-opacity-100 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2 cursor-pointer hover:bg-gray-900/80`}
							>
								<div
									class={`absolute inset-0 bg-gradient-to-br ${tech.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}
								></div>
								<div class="relative">
									<div class="flex items-center gap-5 mb-4">
										<div class="text-5xl group-hover:scale-110 transition-transform duration-300">{tech.icon}</div>
										<h3 class="text-2xl font-bold text-white group-hover:text-primary-400 transition-colors">
											{tech.name}
										</h3>
									</div>
									<p class="text-gray-400 leading-relaxed text-lg group-hover:text-gray-300 transition-colors">
										{tech.description}
									</p>
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
