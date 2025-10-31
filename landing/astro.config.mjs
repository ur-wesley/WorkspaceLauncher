// @ts-check
import { defineConfig } from "astro/config";

import solidJs from "@astrojs/solid-js";
import UnoCSS from "unocss/astro";
import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
 integrations: [
  solidJs(),
  UnoCSS({
   injectReset: true,
  }),
  mdx(),
 ],
});
