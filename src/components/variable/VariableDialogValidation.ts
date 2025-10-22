import * as v from "valibot";

export const variableSchema = v.object({
	key: v.pipe(
		v.string(),
		v.minLength(1, "Variable key is required"),
		v.maxLength(100),
		v.regex(/^[A-Z_][A-Z0-9_]*$/, "Key must be uppercase letters, numbers, and underscores only"),
	),
	value: v.string(),
	isSecure: v.boolean(),
	enabled: v.boolean(),
});

export type VariableFormData = v.InferOutput<typeof variableSchema>;
