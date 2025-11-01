import { onMount, createSignal } from "solid-js";

interface ReleaseInfo {
	published_at: string;
}

interface Props {
	version: string;
}

const Hero = (props: Props) => {
	const [releaseDate, setReleaseDate] = createSignal<string | null>(null);

	onMount(async () => {
		try {
			const response = await fetch("https://api.github.com/repos/ur-wesley/WorkspaceLauncher/releases/latest");
			if (response.ok) {
				const data: ReleaseInfo = await response.json();
				if (data.published_at) {
					setReleaseDate(data.published_at);
				}
			}
		} catch (error) {
			console.error("Failed to fetch release info:", error);
		}
	});

	const version = () => props.version;
	const downloadUrl = () => {
		const versionValue = version();
		return `https://github.com/ur-wesley/WorkspaceLauncher/releases/download/v${versionValue}/WorkspaceLauncher_${versionValue}_x64_en-US.msi`;
	};
	const releasePageUrl = () => `https://github.com/ur-wesley/WorkspaceLauncher/releases/tag/v${version()}`;
	const formattedDate = () => {
		if (!releaseDate()) return "";
		const date = new Date(releaseDate() ?? "");
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
			<div class="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-blue-500/10"></div>
			<div class="absolute inset-0 overflow-hidden">
				<div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
				<div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
			</div>
			<div class="section-container relative z-10 text-center py-20">
				<a
					href={releasePageUrl()}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-block px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full mb-4 hover:bg-primary-500/20 transition-colors"
				>
					<span class="text-primary-400 text-sm font-medium">Version {version()} Available</span>
				</a>
				{releaseDate() && <p class="text-xs text-gray-500 mb-8">Released on {formattedDate()}</p>}
				<h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
					Launch Your Workspaces
					<br />
					<span class="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">In One Click</span>
				</h1>
				<p class="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
					Launch dev environments, start gaming sessions, run workflows—organize and execute multiple applications with
					a single click.
				</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
					<a href={downloadUrl()} class="btn-primary text-lg px-8 py-4">
						Download for Windows
					</a>
					<button
						type="button"
						onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
						class="px-6 py-3 text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors text-lg"
					>
						Learn More
					</button>
				</div>
			</div>
		</section>
	);
};

export default Hero;
