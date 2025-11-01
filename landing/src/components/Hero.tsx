import { onMount, createSignal } from "solid-js";

interface ReleaseInfo {
	published_at: string;
}

interface Props {
	version: string;
	heroImageUrl?: string;
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
			<div class="section-container relative z-10 py-20">
				<div class="grid lg:grid-cols-2 gap-12 items-center">
					<div class="text-center lg:text-left">
						<h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
							Launch Your Workspaces
							<br />
							<span class="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
								In One Click
							</span>
						</h1>
						<p class="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto lg:mx-0">
							Launch dev environments, start gaming sessions, run workflows—organize and execute multiple applications
							with a single click.
						</p>
						<div class="flex flex-col items-center lg:items-start gap-4">
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
							<div class="flex flex-col items-center lg:items-start gap-1">
								<a
									href={releasePageUrl()}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm text-gray-400 hover:text-primary-400 transition-colors"
								>
									Version {version()}
								</a>
								{releaseDate() && <p class="text-xs text-gray-500">Released on {formattedDate()}</p>}
							</div>
						</div>
					</div>
					<div class="relative hidden lg:block">
						<div class="relative transform rotate-6 hover:rotate-3 transition-transform duration-300">
							<div class="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-blue-500/20 rounded-2xl blur-2xl"></div>
							<div class="relative bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-2xl">
								{props.heroImageUrl ? (
									<img
										src={props.heroImageUrl}
										alt="WorkspaceLauncher application interface"
										class="w-full h-auto rounded-lg"
									/>
								) : (
									<div class="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
										<div class="text-center">
											<svg
												class="w-24 h-24 text-gray-600 mx-auto mb-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-label="Desktop application"
											>
												<title>Desktop application</title>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
												/>
											</svg>
											<span class="text-gray-500 text-sm font-medium">Hero Image Placeholder</span>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
