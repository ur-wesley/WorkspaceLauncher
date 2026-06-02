import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { TextFieldTextAreaProps } from "@kobalte/core/text-field";
import { TextArea as TextFieldPrimitive } from "@kobalte/core/text-field";
import type { ValidComponent, VoidProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/libs/cn";

type textAreaProps<T extends ValidComponent = "textarea"> = VoidProps<
	TextFieldTextAreaProps<T> & {
		class?: string;
	}
>;

export const TextArea = <T extends ValidComponent = "textarea">(
	props: PolymorphicProps<T, textAreaProps<T>>,
) => {
	const [local, rest] = splitProps(props as textAreaProps, ["class"]);

	return (
		<TextFieldPrimitive
			class={cn(
				"flex min-h-[60px] w-full rounded-md bg-elevated-2 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:(outline-none ring-1.5 ring-ring) disabled:(cursor-not-allowed opacity-50) transition-shadow",
				local.class,
			)}
			{...rest}
		/>
	);
};
