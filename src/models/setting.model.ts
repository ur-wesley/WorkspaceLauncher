import { object, parse, string } from "valibot";
import { Id, IsoDate, type ModelAdapter } from "./common";

export const SettingSchema = object({
	id: Id,
	key: string(),
	value: string(),
	created_at: IsoDate,
	updated_at: IsoDate,
});
export type Setting = {
	id: number;
	key: string;
	value: string;
	created_at: string;
	updated_at: string;
};

export const NewSettingSchema = object({
	key: string(),
	value: string(),
});
export type NewSetting = { key: string; value: string };

export const SettingAdapter: ModelAdapter<Setting, Setting, Setting> = {
	parse(input) {
		return parse(SettingSchema, input) as Setting;
	},
	fromDb(row) {
		return row;
	},
	toDb(model) {
		return model;
	},
	fromExport(data) {
		return this.parse(data);
	},
	toExport(model) {
		return this.parse(model);
	},
};
