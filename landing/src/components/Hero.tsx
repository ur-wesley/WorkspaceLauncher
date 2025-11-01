import { onMount, onCleanup, createSignal } from "solid-js";

interface ReleaseInfo {
	published_at: string;
}

interface Props {
	version: string;
	heroImageUrl?: string;
}

const words = [
	{
		text: "Workspaces",
		gradient: "from-primary-400 via-blue-400 to-primary-400",
	},
	{
		text: "Gaming Sessions",
		gradient: "from-purple-400 via-pink-400 to-purple-400",
	},
	{
		text: "Dev Environments",
		gradient: "from-green-400 via-emerald-400 to-green-400",
	},
	{ text: "Apps", gradient: "from-orange-400 via-red-400 to-orange-400" },
	{ text: "Workflows", gradient: "from-cyan-400 via-blue-400 to-cyan-400" },
	{ text: "Projects", gradient: "from-indigo-400 via-purple-400 to-indigo-400" },
];

const Hero = (props: Props) => {
	const [releaseDate, setReleaseDate] = createSignal<string | null>(null);
	const [currentWordIndex, setCurrentWordIndex] = createSignal(0);
	const [isAnimating, setIsAnimating] = createSignal(false);
	const [isClicking, setIsClicking] = createSignal(false);
	const [clickPosition, setClickPosition] = createSignal({ x: 50, y: 50 });

	let intervalId: ReturnType<typeof setInterval> | undefined;

	const currentWord = () => words[currentWordIndex()];

	const getRandomPosition = () => {
		return {
			x: Math.random() * 80 + 10,
			y: Math.random() * 80 + 10,
		};
	};

	const handleAnimationEnd = () => {
		setIsAnimating(false);
		setTimeout(() => {
			setIsClicking(false);
		}, 200);
	};

	const handleWordChange = () => {
		setCurrentWordIndex((prev) => (prev + 1) % words.length);
		setTimeout(handleAnimationEnd, 50);
	};

	const changeWord = () => {
		setClickPosition(getRandomPosition());
		setIsClicking(true);
		setIsAnimating(true);
		setTimeout(handleWordChange, 300);
	};

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

		intervalId = setInterval(changeWord, 3000);
	});

	onCleanup(() => {
		if (intervalId) {
			clearInterval(intervalId);
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
		<section class="relative min-h-screen flex items-center justify-center overflow-x-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
			<div class="absolute inset-0 overflow-hidden">
				<div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
				<div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
			</div>
			{props.heroImageUrl && (
				<div class="absolute inset-0 z-0">
					<img
						src={props.heroImageUrl}
						alt=""
						class="absolute inset-0 w-full h-full object-cover object-center opacity-30"
					/>
					<div class="absolute inset-0 bg-gradient-to-b from-gray-900/85 via-gray-900/75 to-gray-900/85"></div>
					<div class="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-transparent to-blue-500/20"></div>
				</div>
			)}
			<div class="section-container relative z-20 py-20 w-full">
				<div class="relative">
					<div class="max-w-4xl mx-auto text-center lg:text-left">
						<div class="flex flex-col justify-center space-y-6">
							<h1 class="font-bold text-white mb-6 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-visible">
								<div class="text-3xl md:text-4xl lg:text-5xl mb-4">Launch Your</div>
								<div class="block w-full min-h-[1.5em] relative select-none text-5xl md:text-7xl lg:text-8xl my-6 overflow-visible pb-2">
									<span
										class={`inline-block w-full leading-normal bg-gradient-to-r ${
											currentWord().gradient
										} bg-clip-text text-transparent transition-all duration-500 ${
											isAnimating()
												? "opacity-0 translate-y-8 scale-95 blur-sm"
												: "opacity-100 translate-y-0 scale-100 blur-0"
										}`}
									>
										{currentWord().text}
									</span>
									{isClicking() && (
										<span
											class="absolute pointer-events-none"
											aria-hidden="true"
											style={{
												left: `${clickPosition().x}%`,
												top: `${clickPosition().y}%`,
												transform: "translate(-50%, -50%)",
											}}
										>
											<span class="absolute w-12 h-12 rounded-full bg-primary-500/40 animate-ping"></span>
											<span class="absolute w-10 h-10 rounded-full bg-primary-500/30 animate-ping animation-delay-100"></span>
											<span class="absolute w-8 h-8 rounded-full bg-primary-500/20 animate-ping animation-delay-200"></span>
										</span>
									)}
								</div>
								<div class="text-3xl md:text-4xl lg:text-5xl font-extrabold mt-6">With One Click</div>
							</h1>
							<p class="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto lg:mx-0 backdrop-blur-sm bg-gray-900/20 rounded-lg p-4 lg:bg-transparent lg:p-0">
								Launch dev environments, start gaming sessions, run workflows—organize and execute multiple applications
								with a single click.
							</p>
							<div class="flex flex-col items-center lg:items-start gap-4">
								<div class="flex flex-col sm:flex-row items-center gap-4">
									<a
										href={downloadUrl()}
										class="btn-primary text-lg px-8 py-4 flex items-center gap-2 shadow-xl hover:shadow-2xl hover:shadow-primary-500/50 transition-all hover:scale-105"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<title>Download</title>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
											/>
										</svg>
										Download for Windows
									</a>
									<button
										type="button"
										onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
										class="px-6 py-3 text-white border-2 border-gray-600 hover:border-primary-500 rounded-lg transition-all text-lg backdrop-blur-sm bg-gray-900/30 hover:bg-gray-900/50 hover:scale-105"
									>
										Learn More
									</button>
								</div>
								<div class="flex flex-col items-center lg:items-start gap-1 backdrop-blur-sm bg-gray-900/20 rounded-lg px-3 py-2 lg:bg-transparent lg:p-0">
									<a
										href={releasePageUrl()}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm text-gray-300 hover:text-primary-400 transition-colors drop-shadow-md font-medium"
									>
										Version {version()}
									</a>
									{releaseDate() && <p class="text-xs text-gray-400 drop-shadow-md">Released on {formattedDate()}</p>}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
