import { render } from "solid-js/web";

import App from "./App";

import "./app.css";
import "virtual:uno.css";
import { addCollection } from "@iconify/iconify";

import("@iconify-json/mdi/icons.json").then((data) => {
	addCollection(data.default);
});

document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
});

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

render(() => <App />, root);
