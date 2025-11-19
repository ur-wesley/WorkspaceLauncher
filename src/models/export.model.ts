import { array, object, optional, parse, string } from "valibot";
import { type Action, ActionExportSchema } from "./action.model";
import { type Theme, ThemeSchema } from "./theme.model";
import { type Tool, ToolSchema } from "./tool.model";
import { type Workspace, WorkspaceSchema } from "./workspace.model";

export const ExportDataSchema = object({
	version: string(),
	exportDate: string(),
	workspaces: optional(array(WorkspaceSchema)),
	actions: optional(array(ActionExportSchema)),
	tools: optional(array(ToolSchema)),
	themes: optional(array(ThemeSchema)),
});

export type ExportData = {
	version: string;
	exportDate: string;
	workspaces?: Workspace[];
	actions?: Action[];
	tools?: Tool[];
	themes?: Theme[];
};

export function safeParseExportData(input: string | unknown): ExportData {
	let data: unknown = input;
	if (typeof input === "string") {
		data = JSON.parse(input);
	}
	return parse(ExportDataSchema, data) as ExportData;
}
