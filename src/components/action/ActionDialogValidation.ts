import * as v from "valibot";

export const basicInfoSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, "Action name is required"), v.maxLength(100)),
});

export const toolSelectionSchema = v.object({
	toolMode: v.picklist(["saved", "custom"]),
	selectedToolId: v.nullable(v.number()),
});

export const savedToolConfigSchema = v.object({
	placeholderValues: v.record(v.string(), v.string()),
});

export const customToolConfigSchema = v.object({
	customToolName: v.pipe(v.string(), v.minLength(1, "Tool name is required")),
	customToolType: v.picklist(["cli", "binary"]),
	customCommand: v.string(),
	customBinaryPath: v.string(),
	customArgsText: v.string(),
	customWorkingDirectory: v.string(),
});

export const advancedSettingsSchema = v.object({
	timeoutSeconds: v.nullable(v.number()),
	orderIndex: v.number(),
	detached: v.boolean(),
	trackProcess: v.boolean(),
});

export type BasicInfo = v.InferOutput<typeof basicInfoSchema>;
export type ToolSelection = v.InferOutput<typeof toolSelectionSchema>;
export type SavedToolConfig = v.InferOutput<typeof savedToolConfigSchema>;
export type CustomToolConfig = v.InferOutput<typeof customToolConfigSchema>;
export type AdvancedSettings = v.InferOutput<typeof advancedSettingsSchema>;
