import { boolean, number, object, optional, parse, string } from "valibot";
import { Id, IsoDate, type ModelAdapter } from "./common";

export const VariableSchema = object({
	id: Id,
	workspace_id: number(),
	key: string(),
	value: string(),
	is_secure: boolean(),
	enabled: optional(boolean()),
	created_at: optional(IsoDate),
	updated_at: optional(IsoDate),
});
export type Variable = {
	id: number;
	workspace_id: number;
	key: string;
	value: string;
	is_secure: boolean;
	enabled?: boolean;
	created_at?: string;
	updated_at?: string;
};

export const VariableDbSchema = object({
	id: number(),
	workspace_id: number(),
	key: string(),
	value: string(),
	is_secure: boolean(),
	enabled: boolean(),
	created_at: string(),
	updated_at: string(),
});
export type VariableDb = {
	id: number;
	workspace_id: number;
	key: string;
	value: string;
	is_secure: boolean;
	enabled: boolean;
	created_at: string;
	updated_at: string;
};

export const VariableAdapter: ModelAdapter<Variable, VariableDb, Variable> = {
	parse(input) {
		return parse(VariableSchema, input) as Variable;
	},
	fromDb(row) {
		return { ...row };
	},
	toDb(model) {
		return {
			...model,
			enabled: model.enabled ?? true,
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
