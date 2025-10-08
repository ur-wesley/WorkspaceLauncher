import { toast } from "somoto";

interface ToastOptions {
	title: string;
	description?: string;
	variant?: "default" | "destructive" | "success";
	duration?: number;
}

export function showToast(options: ToastOptions) {
	const toastOptions = {
		description: options.description,
		duration: options.duration,
	};

	switch (options.variant) {
		case "destructive":
			toast.error(options.title, toastOptions);
			break;
		case "success":
			toast.success(options.title, toastOptions);
			break;
		default:
			toast(options.title, toastOptions);
			break;
	}
}
