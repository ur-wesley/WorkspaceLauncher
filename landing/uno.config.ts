import { defineConfig, presetWind4, presetTypography } from "unocss";

export default defineConfig({
 presets: [presetWind4(), presetTypography()],
 theme: {
  colors: {
   primary: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
    950: "#082f49",
   },
  },
  animation: {
   keyframes: {
    float: `{
					0%, 100% { transform: translate(0, 0) scale(1); }
					33% { transform: translate(30px, -30px) scale(1.05); }
					66% { transform: translate(-20px, 20px) scale(0.95); }
				}`,
   },
   durations: {
    float: "20s",
   },
   timingFns: {
    float: "ease-in-out",
   },
   counts: {
    float: "infinite",
   },
  },
 },
 shortcuts: {
  "btn-primary":
   "px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors",
  "btn-secondary":
   "px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors",
  "section-container": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  "animate-float": "animate-[float_20s_ease-in-out_infinite]",
 },
});
