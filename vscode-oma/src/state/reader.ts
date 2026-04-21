export interface WorkflowState {
  id: string;
  mode: string;
  active: boolean;
  phase?: string;
  iteration?: number;
  task?: string;
  updatedAt?: string;
}

export interface AgentInfo {
  id: string;
  type: string;
  status: 'running' | 'completed' | 'failed' | 'unknown';
  teamName?: string;
  startedAt?: string;
  updatedAt?: string;
  summary?: string;
}

export interface TaskInfo {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed' | 'unknown';
  owner?: string;
}

export interface StateReader {
  getWorkflows(): WorkflowState[];
  getAgents(): AgentInfo[];
  getTasks(): TaskInfo[];
}
