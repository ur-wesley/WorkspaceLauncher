import { useColorMode } from "@kobalte/core";
import { Toaster as Sonner } from "somoto";

export const Toaster = (props: Parameters<typeof Sonner>[0]) => {
	const { colorMode } = useColorMode();

	return (
		<Sonner
			theme={colorMode()}
			style={{
				"--normal-bg": "hsl(var(--background))",
				"--normal-text": "hsl(var(--foreground))",
				"--normal-border": "hsl(var(--border))",
				"--success-bg": "hsl(var(--primary))",
				"--success-text": "hsl(var(--primary-foreground))",
				"--success-border": "hsl(var(--primary))",
				"--error-bg": "hsl(var(--destructive))",
				"--error-text": "hsl(var(--destructive-foreground))",
				"--error-border": "hsl(var(--destructive))",
			}}
			toastOptions={{
				style: {
					padding: "0.5rem",
					background: "hsl(var(--background))",
					color: "hsl(var(--foreground))",
					border: "1px solid hsl(var(--border))",
					"box-shadow":
						"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
				},
				className: "sonner-toast",
			}}
			{...props}
		/>
	);
};
