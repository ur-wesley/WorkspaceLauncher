import {
 defineConfig,
 presetIcons,
 presetTypography,
 presetWind4,
 transformerDirectives,
 transformerVariantGroup,
} from "unocss";
import presetAnimations from "unocss-preset-animations";

export default defineConfig({
 presets: [
  presetWind4({
   dark: {
    dark: '[data-kb-theme="dark"]',
    light: '[data-kb-theme="light"]',
   },
   prefix: "",
   preflights: {
    reset: true,
   },
  }),
  presetAnimations(),
  presetIcons({
   collections: {
    mdi: () => import("@iconify-json/mdi/icons.json").then((i) => i.default),
   },
   extraProperties: {
    display: "inline-block",
    "vertical-align": "middle",
   },
  }),
  presetTypography(),
 ],
 transformers: [transformerVariantGroup(), transformerDirectives()],
 theme: {
  colors: {
   border: "hsl(var(--border))",
   input: "hsl(var(--input))",
   ring: "hsl(var(--ring))",
   background: "hsl(var(--background))",
   foreground: "hsl(var(--foreground))",
   primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
   },
   secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
   },
   destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
   },
   muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
   },
   accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
   },
   popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
   },
   card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
   },
  },
  borderRadius: {
   lg: "var(--radius)",
   md: "calc(var(--radius) - 2px)",
   sm: "calc(var(--radius) - 4px)",
  },
  animation: {
   keyframes: {
    "accordion-down":
     "{ from { height: 0 } to { height: var(--kb-accordion-content-height) } }",
    "accordion-up":
     "{ from { height: var(--kb-accordion-content-height) } to { height: 0 } }",
    "collapsible-down":
     "{ from { height: 0 } to { height: var(--kb-collapsible-content-height) } }",
    "collapsible-up":
     "{ from { height: var(--kb-collapsible-content-height) } to { height: 0 } }",
    "caret-blink": "{ 0%,70%,100% { opacity: 1 } 20%,50% { opacity: 0 } }",
   },
   timingFns: {
    "accordion-down": "ease-out",
    "accordion-up": "ease-out",
    "collapsible-down": "ease-out",
    "collapsible-up": "ease-out",
    "caret-blink": "ease-out",
   },
   durations: {
    "accordion-down": "0.2s",
    "accordion-up": "0.2s",
    "collapsible-down": "0.2s",
    "collapsible-up": "0.2s",
    "caret-blink": "1.25s",
   },
   counts: {
    "caret-blink": "infinite",
   },
  },
 },
 safelist: [
  "line-clamp-1",
  "line-clamp-2",
  "line-clamp-3",
  "line-clamp-4",
  "line-clamp-5",
  "line-clamp-6",
 ],
 content: {
  pipeline: {
   include: [
    /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
    "src/**/*.{js,ts,jsx,tsx}",
   ],
  },
 },
});
