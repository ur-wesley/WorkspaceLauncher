
export type ApiError = {
	message: string;
	code?: string;
};

export interface LaunchActionRequest {
	workspace_id: number;
	action_id: number;
	action_type: string;
	config: Record<string, unknown>;
	variables: Record<string, string>;
}

export interface LaunchWorkspaceRequest {
	workspace_id: number;
	actions: LaunchActionRequest[];
}

export interface LaunchResult {
	success: boolean;
	message: string;
	process_id?: number;
	run_id?: number;
}

export interface ActionStartedEvent {
	action_id: number;
	workspace_id: number;
	run_id: number;
	process_id?: number;
}

export interface ActionCompletedEvent {
	action_id: number;
	workspace_id: number;
	run_id: number;
	exit_code?: number;
	success: boolean;
}

export interface ActionLogEvent {
	action_id: number;
	workspace_id: number;
	run_id: number;
	level: string;
	message: string;
}
