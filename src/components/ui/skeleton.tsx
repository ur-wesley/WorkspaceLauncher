import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/libs/cn";

export const Skeleton = (props: ComponentProps<"div">) => {
	const [local, rest] = splitProps(props, ["class"]);

	return <div class={cn("animate-pulse rounded-md bg-primary/10", local.class)} {...rest} />;
};
