import type { ImageMetadata } from "astro";
import actionsImg from "../assets/actions.png";
import darkImg from "../assets/dark.png";
import launchImg from "../assets/launch.png";
import lightImg from "../assets/light.png";
import workspaceImg from "../assets/workspace.png";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

interface Screenshot {
	title: string;
	description: string;
	alt: string;
	imageUrl?: ImageMetadata;
	isComparison?: boolean;
	compareImageUrl?: ImageMetadata;
}

const screenshots: Screenshot[] = [
	{
		title: "Workspace Management",
		description: "Organize and manage all your workspaces from a clean, intuitive interface",
		alt: "WorkspaceLauncher workspace management interface",
		imageUrl: workspaceImg,
	},
	{
		title: "Action Configuration",
		description: "Easily configure actions, tools, and variables for each workspace",
		alt: "WorkspaceLauncher action configuration screen",
		imageUrl: actionsImg,
	},
	{
		title: "Customizable Themes",
		description: "Switch between light and dark modes, or create your own custom theme with the built-in theme creator",
		alt: "WorkspaceLauncher theme customization",
		imageUrl: darkImg,
		isComparison: true,
		compareImageUrl: lightImg,
	},
	{
		title: "One-Click Launch",
		description: "Launch your entire workspace environment with a single click",
		alt: "WorkspaceLauncher launch interface",
		imageUrl: launchImg,
	},
];

const Screenshots = () => {
	const [selectedImage, setSelectedImage] = createSignal<{
		url: string;
		alt: string;
		title: string;
	} | null>(null);
	const [sliderPositions, setSliderPositions] = createSignal<Record<number, number>>({});

	const openLightbox = (image: ImageMetadata, alt: string, title: string) => {
		if (image) {
			setSelectedImage({ url: image.src, alt, title });
			document.body.style.overflow = "hidden";
		}
	};

	const closeLightbox = () => {
		setSelectedImage(null);
		document.body.style.overflow = "";
	};

	const handleSliderMove = (index: number, clientX: number, containerRef: HTMLDivElement) => {
		const rect = containerRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
		const percent = (x / rect.width) * 100;
		setSliderPositions({ ...sliderPositions(), [index]: percent });
	};

	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeLightbox();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		onCleanup(() => {
			document.removeEventListener("keydown", handleKeyDown);
		});

		const initialPositions: Record<number, number> = {};
		for (const [index] of screenshots.entries()) {
			initialPositions[index] = 50;
		}
		setSliderPositions(initialPositions);
	});

	return (
		<section class="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden py-20">
			<div class="absolute inset-0 overflow-hidden">
				<div class="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-blue-500/10"></div>
				<div class="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-primary-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
				<div class="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-blue-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float animation-delay-2000"></div>
				<div class="absolute top-1/2 right-1/3 w-96 h-96 bg-purple-500/15 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float animation-delay-4000"></div>
				<div class="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_20%,black)]"></div>
			</div>
			<div class="section-container relative z-10 py-16 w-full max-w-[1600px]">
				<div class="text-center mb-16">
					<h2 class="text-5xl md:text-6xl font-bold text-white mb-6">
						See It In{" "}
						<span class="bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
							Action
						</span>
					</h2>
					<p class="text-2xl text-gray-300 max-w-3xl mx-auto">
						Experience the power of WorkspaceLauncher through these screenshots
					</p>
				</div>
				<div class="grid md:grid-cols-2 gap-8 lg:gap-10">
					{screenshots.map((screenshot, index) => (
						<div class="group flex flex-col">
							<div class="relative bg-gray-900/60 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-gray-700 hover:border-primary-500/70 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2 flex-grow flex flex-col">
								{screenshot.isComparison && screenshot.compareImageUrl && screenshot.imageUrl ? (
									<div
										class="w-full flex-grow bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden min-h-[450px] select-none"
										ref={(el) => {
											let isDragging = false;

											const handleMove = (clientX: number) => {
												if (isDragging) {
													handleSliderMove(index, clientX, el);
												}
											};

											const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
											const handleTouchMove = (e: TouchEvent) => {
												if (e.touches.length > 0) {
													handleMove(e.touches[0].clientX);
												}
											};

											const startDragging = (clientX: number) => {
												isDragging = true;
												handleSliderMove(index, clientX, el);
											};

											const stopDragging = () => {
												isDragging = false;
											};

											const handleMouseDown = (e: MouseEvent) => {
												e.preventDefault();
												startDragging(e.clientX);
											};

											const handleTouchStart = (e: TouchEvent) => {
												if (e.touches.length > 0) {
													startDragging(e.touches[0].clientX);
												}
											};

											el.addEventListener("mousedown", handleMouseDown);
											document.addEventListener("mousemove", handleMouseMove);
											document.addEventListener("mouseup", stopDragging);

											el.addEventListener("touchstart", handleTouchStart, {
												passive: true,
											});
											el.addEventListener("touchmove", handleTouchMove, { passive: true });
											el.addEventListener("touchend", stopDragging, { passive: true });

											onCleanup(() => {
												el.removeEventListener("mousedown", handleMouseDown);
												document.removeEventListener("mousemove", handleMouseMove);
												document.removeEventListener("mouseup", stopDragging);
												el.removeEventListener("touchstart", handleTouchStart);
												el.removeEventListener("touchmove", handleTouchMove);
												el.removeEventListener("touchend", stopDragging);
											});
										}}
									>
										<img
											src={screenshot.imageUrl.src}
											alt={screenshot.alt}
											class="absolute inset-0 w-full h-full object-contain p-4"
										/>
										<div
											class="absolute inset-0 overflow-hidden"
											style={{
												"clip-path": `inset(0 ${100 - (sliderPositions()[index] || 50)}% 0 0)`,
											}}
										>
											<img
												src={screenshot.compareImageUrl.src}
												alt={`${screenshot.alt} - Light theme`}
												class="absolute inset-0 w-full h-full object-contain p-4"
											/>
										</div>
										<div
											class="absolute top-0 bottom-0 w-1 bg-primary-500 cursor-ew-resize touch-none"
											style={{ left: `${sliderPositions()[index] || 50}%` }}
										>
											<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-10 md:h-10 bg-primary-500 rounded-full shadow-lg flex items-center justify-center">
												<svg
													class="w-7 h-7 md:w-6 md:h-6 text-white rotate-90"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<title>Slider control icon</title>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 9l4-4 4 4m0 6l-4 4-4-4"
													/>
												</svg>
											</div>
										</div>
										<div class="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-semibold pointer-events-none">
											Dark
										</div>
										<div class="absolute bottom-4 right-4 bg-gray-100/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-gray-900 text-sm font-semibold pointer-events-none">
											Light
										</div>
									</div>
								) : (
									<button
										type="button"
										disabled={!screenshot.imageUrl}
										class="w-full flex-grow bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden cursor-pointer disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 min-h-[450px]"
										onClick={() =>
											screenshot.imageUrl && openLightbox(screenshot.imageUrl, screenshot.alt, screenshot.title)
										}
										aria-label={screenshot.imageUrl ? `View full size ${screenshot.title}` : undefined}
									>
										{screenshot.imageUrl ? (
											<>
												<img
													src={screenshot.imageUrl.src}
													alt={screenshot.alt}
													class="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
												/>
												<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8">
													<div class="flex items-center gap-2 text-white font-semibold text-lg">
														<svg
															class="w-6 h-6"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															aria-label="Expand image"
														>
															<title>Expand image</title>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
															/>
														</svg>
														<span>Click to enlarge</span>
													</div>
												</div>
											</>
										) : (
											<div class="w-full h-full flex flex-col items-center justify-center gap-4">
												<svg
													class="w-24 h-24 text-gray-600 group-hover:text-gray-500 transition-colors"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-label="Image placeholder"
												>
													<title>Image placeholder</title>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
													/>
												</svg>
												<span class="text-sm text-gray-500 group-hover:text-gray-400 transition-colors font-medium">
													Screenshot Placeholder
												</span>
											</div>
										)}
									</button>
								)}
								<div class="p-6 bg-gray-900/70 border-t border-gray-700/50">
									<h3 class="text-2xl font-bold text-white mb-3 group-hover:text-primary-400 transition-colors">
										{screenshot.title}
									</h3>
									<p class="text-gray-400 text-base group-hover:text-gray-300 transition-colors leading-relaxed">
										{screenshot.description}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
				<Show when={selectedImage()}>
					<Portal>
						<div
							class="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/95 backdrop-blur-md p-8"
							onClick={closeLightbox}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									closeLightbox();
								}
							}}
							role="none"
						>
							<button
								type="button"
								class="fixed top-6 right-6 text-white hover:text-primary-400 transition-colors z-[2147483647] bg-gray-900/50 rounded-full p-3 hover:bg-gray-900/80"
								onClick={closeLightbox}
								aria-label="Close lightbox"
							>
								<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Close">
									<title>Close</title>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
							<dialog
								open
								aria-label="Image lightbox"
								class="relative m-0 p-0 bg-transparent max-w-none max-h-none"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								<div class="relative w-full max-w-[95vw] max-h-[95vh] flex flex-col" role="none">
									<div class="flex-grow flex items-center justify-center mb-4">
										<img
											src={selectedImage()?.url}
											alt={selectedImage()?.alt}
											class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
										/>
									</div>
									<div class="bg-gray-900/90 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
										<h3 class="text-white text-2xl font-bold mb-2">{selectedImage()?.title}</h3>
										<p class="text-gray-300 text-base">{selectedImage()?.alt}</p>
									</div>
								</div>
							</dialog>
						</div>
					</Portal>
				</Show>
			</div>
		</section>
	);
};

export default Screenshots;
