import { createSignal, onMount, onCleanup } from "solid-js";

interface Screenshot {
	title: string;
	description: string;
	alt: string;
	imageUrl?: string;
}

const screenshots: Screenshot[] = [
	{
		title: "Workspace Management",
		description: "Organize and manage all your workspaces from a clean, intuitive interface",
		alt: "WorkspaceLauncher workspace management interface",
	},
	{
		title: "Action Configuration",
		description: "Easily configure actions, tools, and variables for each workspace",
		alt: "WorkspaceLauncher action configuration screen",
	},
	{
		title: "One-Click Launch",
		description: "Launch your entire workspace environment with a single click",
		alt: "WorkspaceLauncher launch interface",
	},
];

const Screenshots = () => {
	const [selectedImage, setSelectedImage] = createSignal<{ url: string; alt: string; title: string } | null>(null);

	const openLightbox = (imageUrl: string, alt: string, title: string) => {
		if (imageUrl) {
			setSelectedImage({ url: imageUrl, alt, title });
		}
	};

	const closeLightbox = () => {
		setSelectedImage(null);
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
	});

	return (
		<section class="relative py-32 bg-gray-900 overflow-hidden">
			<div class="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-blue-500/5"></div>
			<div class="section-container relative z-10">
				<div class="text-center mb-20">
					<h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
						See It In{" "}
						<span class="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">Action</span>
					</h2>
					<p class="text-xl text-gray-400 max-w-2xl mx-auto">
						Experience the power of WorkspaceLauncher through these screenshots
					</p>
				</div>
				<div class="grid md:grid-cols-3 gap-8">
					{screenshots.map((screenshot) => (
						<div class="group">
							<div class="relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-primary-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1">
								<button
									type="button"
									disabled={!screenshot.imageUrl}
									class="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-800 relative overflow-hidden cursor-pointer disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800"
									onClick={() =>
										screenshot.imageUrl && openLightbox(screenshot.imageUrl, screenshot.alt, screenshot.title)
									}
									aria-label={screenshot.imageUrl ? `View full size ${screenshot.title}` : undefined}
								>
									{screenshot.imageUrl ? (
										<>
											<img
												src={screenshot.imageUrl}
												alt={screenshot.alt}
												class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
												<svg
													class="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
											</div>
										</>
									) : (
										<div class="w-full h-full flex flex-col items-center justify-center gap-3">
											<svg
												class="w-20 h-20 text-gray-600 group-hover:text-gray-500 transition-colors"
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
											<span class="text-xs text-gray-600 group-hover:text-gray-500 transition-colors font-medium">
												Screenshot Placeholder
											</span>
										</div>
									)}
								</button>
								<div class="p-6 bg-gray-800/50">
									<h3 class="text-xl font-bold text-white mb-2">{screenshot.title}</h3>
									<p class="text-gray-400 text-sm">{screenshot.description}</p>
								</div>
							</div>
						</div>
					))}
				</div>
				{selectedImage() && (
					<div
						role="dialog"
						aria-modal="true"
						aria-label="Image lightbox"
						class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
						onClick={closeLightbox}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								closeLightbox();
							}
						}}
					>
						<button
							type="button"
							class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
							onClick={closeLightbox}
							aria-label="Close lightbox"
						>
							<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Close">
								<title>Close</title>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						<div
							class="relative max-w-7xl max-h-full"
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
							role="none"
						>
							<img
								src={selectedImage()?.url}
								alt={selectedImage()?.alt}
								class="max-w-full max-h-[90vh] object-contain rounded-lg"
							/>
							<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
								<h3 class="text-white text-xl font-bold mb-1">{selectedImage()?.title}</h3>
								<p class="text-gray-300 text-sm">{selectedImage()?.alt}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

export default Screenshots;
