import {
	boolean,
	literal,
	number,
	object,
	optional,
	parse,
	string,
	union,
} from "valibot";
import {
	Id,
	IsoDate,
	type ModelAdapter,
	NullableString,
	OptionalNullableString,
} from "./common";

const ToolType = union([literal("binary"), literal("cli")]);

export const ToolSchema = object({
	id: Id,
	name: string(),
	description: OptionalNullableString,
	icon: OptionalNullableString,
	enabled: boolean(),
	tool_type: ToolType,
	template: string(),
	placeholders: string(),
	category: OptionalNullableString,
	created_at: optional(IsoDate),
	updated_at: optional(IsoDate),
});
export type Tool = {
	id: number;
	name: string;
	description?: string | null;
	icon?: string | null;
	enabled: boolean;
	tool_type: "binary" | "cli";
	template: string;
	placeholders: string;
	category?: string | null;
	created_at?: string;
	updated_at?: string;
};

export const ToolDbSchema = object({
	id: number(),
	name: string(),
	description: NullableString,
	icon: NullableString,
	enabled: boolean(),
	tool_type: ToolType,
	template: string(),
	placeholders: string(),
	category: NullableString,
	created_at: string(),
	updated_at: string(),
});
export type ToolDb = {
	id: number;
	name: string;
	description: string | null;
	icon: string | null;
	enabled: boolean;
	tool_type: "binary" | "cli";
	template: string;
	placeholders: string;
	category: string | null;
	created_at: string;
	updated_at: string;
};

export type ToolExport = Tool;

export const ToolAdapter: ModelAdapter<Tool, ToolDb, ToolExport> = {
	parse(input) {
		return parse(ToolSchema, input) as Tool;
	},
	fromDb(row) {
		return { ...row };
	},
	toDb(model) {
		return {
			...model,
			description: model.description ?? null,
			icon: model.icon ?? null,
			category: model.category ?? null,
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
