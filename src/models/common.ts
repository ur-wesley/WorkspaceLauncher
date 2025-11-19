import {
	boolean,
	literal,
	nullable,
	number,
	optional,
	string,
	union,
} from "valibot";

export const Id = number();
export const IsoDate = string();
export const NullableString = nullable(string());
export const OptionalNullableString = optional(NullableString);
export const BoolLoose = union([
	boolean(),
	literal("true"),
	literal("false"),
	literal("1"),
	literal("0"),
]);

export interface ModelAdapter<M, Db, Ex> {
	parse: (input: unknown) => M;
	fromDb: (row: Db) => M;
	toDb: (model: M) => Db;
	fromExport: (data: Ex) => M;
	toExport: (model: M) => Ex;
}

export const jsonParse = <T>(s: string, fallback: T): T => {
	try {
		return JSON.parse(s) as T;
	} catch {
		return fallback;
	}
};

export const jsonStringify = (v: unknown): string => JSON.stringify(v);
