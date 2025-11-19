import { number, object, optional, parse, string } from "valibot";
import {
	Id,
	IsoDate,
	type ModelAdapter,
	NullableString,
	OptionalNullableString,
} from "./common";

export const WorkspaceSchema = object({
	id: Id,
	name: string(),
	description: OptionalNullableString,
	icon: OptionalNullableString,
	created_at: optional(IsoDate),
	updated_at: optional(IsoDate),
});

export type Workspace = {
	id: number;
	name: string;
	description: string | null | undefined;
	icon: string | null | undefined;
	created_at?: string;
	updated_at?: string;
};

export const WorkspaceDbSchema = object({
	id: number(),
	name: string(),
	description: NullableString,
	icon: NullableString,
	created_at: string(),
	updated_at: string(),
});
export type WorkspaceDb = {
	id: number;
	name: string;
	description: string | null;
	icon: string | null;
	created_at: string;
	updated_at: string;
};

export type WorkspaceExport = Workspace;

export const WorkspaceAdapter: ModelAdapter<
	Workspace,
	WorkspaceDb,
	WorkspaceExport
> = {
	parse(input) {
		return parse(WorkspaceSchema, input) as Workspace;
	},
	fromDb(row) {
		return {
			id: row.id,
			name: row.name,
			description: row.description,
			icon: row.icon,
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
	},
	toDb(model) {
		return {
			id: model.id,
			name: model.name,
			description: model.description ?? null,
			icon: model.icon ?? null,
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
