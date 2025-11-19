import { defineStepper } from "@stepperize/solid";
import { type Component, createMemo, For, type JSX, Show } from "solid-js";
import { cn } from "@/libs/cn";
import { Button } from "./button";

export interface StepConfig {
	id: string;
	title: string;
	description?: string;
	optional?: boolean;
}

interface StepperProps {
	steps: StepConfig[];
	currentStepId: string;
	onStepChange?: (stepId: string) => void;
	class?: string;
}

export const StepperIndicator: Component<StepperProps> = (props) => {
	const currentIndex = createMemo(() =>
		props.steps.findIndex((s) => s.id === props.currentStepId),
	);

	return (
		<div class={cn("w-full", props.class)}>
			<ol class="flex items-center w-full">
				<For each={props.steps}>
					{(step, index) => {
						const isActive = () => step.id === props.currentStepId;
						const isCompleted = () => index() < currentIndex();
						const isLast = () => index() === props.steps.length - 1;

						return (
							<li class={cn("flex items-center", !isLast() && "flex-1")}>
								<div class="flex flex-col items-center gap-2">
									<button
										type="button"
										onClick={() => props.onStepChange?.(step.id)}
										class={cn(
											"flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
											isActive() &&
												"border-primary bg-primary text-primary-foreground font-semibold shadow-lg scale-110",
											isCompleted() &&
												!isActive() &&
												"border-primary bg-primary/20 text-primary",
											!isActive() &&
												!isCompleted() &&
												"border-muted bg-muted text-muted-foreground",
										)}
									>
										<Show
											when={isCompleted() && !isActive()}
											fallback={<span>{index() + 1}</span>}
										>
											<div class="i-mdi-check w-5 h-5" />
										</Show>
									</button>
									<div class="flex flex-col items-center text-center min-w-24">
										<span
											class={cn(
												"text-sm font-medium transition-colors",
												isActive() && "text-foreground",
												!isActive() && "text-muted-foreground",
											)}
										>
											{step.title}
										</span>
										<Show when={step.description}>
											<span class="text-xs text-muted-foreground mt-0.5">
												{step.description}
											</span>
										</Show>
										<Show when={step.optional}>
											<span class="text-xs text-muted-foreground italic mt-0.5">
												Optional
											</span>
										</Show>
									</div>
								</div>
								<Show when={!isLast()}>
									<div
										class={cn(
											"h-0.5 flex-1 mx-2 transition-colors",
											isCompleted() ? "bg-primary" : "bg-muted",
										)}
									/>
								</Show>
							</li>
						);
					}}
				</For>
			</ol>
		</div>
	);
};

interface StepperNavigationProps {
	currentStep: StepConfig;
	isFirst: boolean;
	isLast: boolean;
	onPrevious?: () => void;
	onNext?: () => void;
	onSubmit?: () => void;
	canGoNext?: boolean;
	canSubmit?: boolean;
	isLoading?: boolean;
	nextLabel?: string;
	submitLabel?: string;
	class?: string;
}

export const StepperNavigation: Component<StepperNavigationProps> = (props) => {
	return (
		<div class={cn("flex justify-between items-center gap-4", props.class)}>
			<Button
				type="button"
				variant="outline"
				onClick={props.onPrevious}
				disabled={props.isFirst || props.isLoading}
				class={cn(props.isFirst && "invisible")}
			>
				<div class="i-mdi-chevron-left w-4 h-4 mr-2" />
				Previous
			</Button>

			<div class="flex gap-2">
				<Show when={!props.isLast}>
					<Button
						type="button"
						onClick={props.onNext}
						disabled={!props.canGoNext || props.isLoading}
					>
						{props.nextLabel || "Next"}
						<div class="i-mdi-chevron-right w-4 h-4 ml-2" />
					</Button>
				</Show>

				<Show when={props.isLast}>
					<Button
						type="button"
						onClick={props.onSubmit}
						disabled={!props.canSubmit || props.isLoading}
					>
						<Show when={props.isLoading}>
							<div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						</Show>
						{props.submitLabel || "Submit"}
					</Button>
				</Show>
			</div>
		</div>
	);
};

interface StepperContentProps {
	title?: string;
	description?: string;
	children: JSX.Element;
	class?: string;
}

export const StepperContent: Component<StepperContentProps> = (props) => {
	return (
		<div class={cn("space-y-4", props.class)}>
			<Show when={props.title || props.description}>
				<div class="space-y-2">
					<Show when={props.title}>
						<h3 class="text-lg font-semibold">{props.title}</h3>
					</Show>
					<Show when={props.description}>
						<p class="text-sm text-muted-foreground">{props.description}</p>
					</Show>
				</div>
			</Show>
			<div>{props.children}</div>
		</div>
	);
};

export function createFormStepper<T extends readonly StepConfig[]>(
	...steps: T
) {
	return defineStepper(...steps);
}
