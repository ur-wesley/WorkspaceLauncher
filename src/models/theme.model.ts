import {
	boolean,
	nullable,
	number,
	object,
	optional,
	parse,
	string,
} from "valibot";
import { Id, IsoDate, type ModelAdapter } from "./common";

export const ThemeSchema = object({
	id: Id,
	name: string(),
	description: optional(nullable(string())),
	is_predefined: optional(boolean()),
	is_active: optional(boolean()),
	light_colors: string(),
	dark_colors: string(),
	created_at: optional(IsoDate),
	updated_at: optional(IsoDate),
});
export type Theme = {
	id: number;
	name: string;
	description?: string | null;
	is_predefined?: boolean;
	is_active?: boolean;
	light_colors: string;
	dark_colors: string;
	created_at?: string;
	updated_at?: string;
};

export const ThemeDbSchema = object({
	id: number(),
	name: string(),
	description: nullable(string()),
	is_predefined: boolean(),
	is_active: boolean(),
	light_colors: string(),
	dark_colors: string(),
	created_at: string(),
	updated_at: string(),
});
export type ThemeDb = {
	id: number;
	name: string;
	description: string | null;
	is_predefined: boolean;
	is_active: boolean;
	light_colors: string;
	dark_colors: string;
	created_at: string;
	updated_at: string;
};

export type ThemeExport = Theme;

export const ThemeAdapter: ModelAdapter<Theme, ThemeDb, ThemeExport> = {
	parse(input) {
		return parse(ThemeSchema, input) as Theme;
	},
	fromDb(row) {
		return { ...row };
	},
	toDb(model) {
		return {
			id: model.id,
			name: model.name,
			description: model.description ?? null,
			is_predefined: model.is_predefined ?? false,
			is_active: model.is_active ?? false,
			light_colors: model.light_colors,
			dark_colors: model.dark_colors,
			created_at: model.created_at ?? new Date().toISOString(),
			updated_at: model.updated_at ?? new Date().toISOString(),
		};
	},
	fromExport(data) {
		return this.parse(data);
	},
	toExport(model) {
		return this.parse(model);
	},
};
