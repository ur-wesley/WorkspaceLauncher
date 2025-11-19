import {
	boolean,
	nullable,
	number,
	object,
	optional,
	parse,
	string,
} from "valibot";
import {
	BoolLoose,
	Id,
	IsoDate,
	type ModelAdapter,
	NullableString,
	OptionalNullableString,
} from "./common";

export const ActionSchema = object({
	id: Id,
	workspace_id: number(),
	name: string(),
	action_type: string(),
	config: string(),
	dependencies: OptionalNullableString,
	timeout_seconds: optional(nullable(number())),
	detached: boolean(),
	track_process: boolean(),
	auto_launch: optional(boolean()),
	os_overrides: OptionalNullableString,
	order_index: number(),
	created_at: optional(IsoDate),
	updated_at: optional(IsoDate),
});

export type Action = {
	id: number;
	workspace_id: number;
	name: string;
	action_type: string;
	config: string;
	dependencies: string | null | undefined;
	timeout_seconds?: number | null;
	detached: boolean;
	track_process: boolean;
	auto_launch?: boolean;
	os_overrides: string | null | undefined;
	order_index: number;
	created_at?: string;
	updated_at?: string;
};

export const ActionDbSchema = object({
	id: number(),
	workspace_id: number(),
	name: string(),
	action_type: string(),
	config: string(),
	dependencies: NullableString,
	timeout_seconds: nullable(number()),
	detached: boolean(),
	track_process: boolean(),
	auto_launch: boolean(),
	os_overrides: NullableString,
	order_index: number(),
	created_at: string(),
	updated_at: string(),
});
export type ActionDb = {
	id: number;
	workspace_id: number;
	name: string;
	action_type: string;
	config: string;
	dependencies: string | null;
	timeout_seconds: number | null;
	detached: boolean;
	track_process: boolean;
	auto_launch: boolean;
	os_overrides: string | null;
	order_index: number;
	created_at: string;
	updated_at: string;
};

export const ActionExportSchema = object({
	id: number(),
	workspace_id: optional(number()),
	name: string(),
	action_type: string(),
	config: string(),
	dependencies: optional(nullable(string())),
	timeout_seconds: optional(nullable(number())),
	detached: optional(BoolLoose),
	track_process: optional(BoolLoose),
	auto_launch: optional(BoolLoose),
	os_overrides: optional(nullable(string())),
	order_index: number(),
});
export type ActionExport = {
	id: number;
	workspace_id?: number;
	name: string;
	action_type: string;
	config: string;
	dependencies?: string | null;
	timeout_seconds?: number | null;
	detached?: boolean | "true" | "false" | "1" | "0";
	track_process?: boolean | "true" | "false" | "1" | "0";
	auto_launch?: boolean | "true" | "false" | "1" | "0";
	os_overrides?: string | null;
	order_index: number;
};

function looseBool(v: unknown, def = false): boolean {
	if (typeof v === "boolean") return v;
	if (v === "true" || v === "1") return true;
	if (v === "false" || v === "0") return false;
	return def;
}

export const ActionAdapter: ModelAdapter<Action, ActionDb, ActionExport> = {
	parse(input) {
		return parse(ActionSchema, input) as Action;
	},
	fromDb(row) {
		return {
			id: row.id,
			workspace_id: row.workspace_id,
			name: row.name,
			action_type: row.action_type,
			config: row.config,
			dependencies: row.dependencies,
			timeout_seconds: row.timeout_seconds,
			detached: row.detached,
			track_process: row.track_process,
			auto_launch: row.auto_launch,
			os_overrides: row.os_overrides,
			order_index: row.order_index,
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
	},
	toDb(model) {
		return {
			id: model.id,
			workspace_id: model.workspace_id,
			name: model.name,
			action_type: model.action_type,
			config: model.config,
			dependencies: model.dependencies ?? null,
			timeout_seconds: model.timeout_seconds ?? null,
			detached: model.detached,
			track_process: model.track_process,
			auto_launch: model.auto_launch ?? false,
			os_overrides: model.os_overrides ?? null,
			order_index: model.order_index,
			created_at: model.created_at ?? new Date().toISOString(),
			updated_at: model.updated_at ?? new Date().toISOString(),
		};
	},
	fromExport(data) {
		const d = parse(ActionExportSchema, data) as ActionExport;
		return {
			id: d.id,
			workspace_id: d.workspace_id ?? 0,
			name: d.name,
			action_type: d.action_type,
			config: d.config,
			dependencies: d.dependencies ?? null,
			timeout_seconds: d.timeout_seconds ?? null,
			detached: looseBool(d.detached, false),
			track_process: looseBool(d.track_process, false),
			auto_launch: looseBool(d.auto_launch, false),
			os_overrides: d.os_overrides ?? null,
			order_index: d.order_index,
		};
	},
	toExport(model) {
		return {
			id: model.id,
			workspace_id: model.workspace_id,
			name: model.name,
			action_type: model.action_type,
			config: model.config,
			dependencies: model.dependencies ?? null,
			timeout_seconds: model.timeout_seconds ?? null,
			detached: model.detached,
			track_process: model.track_process,
			auto_launch: model.auto_launch ?? false,
			os_overrides: model.os_overrides ?? null,
			order_index: model.order_index,
		};
	},
};
