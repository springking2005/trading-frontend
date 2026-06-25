const BASE = '/api/v1';

function token(): string | null { return localStorage.getItem('token'); }

async function request(method: string, path: string, body?: unknown): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  put: (path: string, body?: unknown) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
};

export function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Multi-Execution Types ──

export interface ExecutionInfo {
  id: string;
  name: string;
  state: string;
  strategy_template_name?: string;
  unrealized_pnl?: number;
  is_primary?: boolean;
  created_at?: string;
}

export interface ExecutionPerformance {
  execution_id: string;
  total_invested: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
  pnl_pct: number;
  trade_count: number;
  win_rate?: number;
}

export interface CreateExecutionRequest {
  stock_id: string;
  strategy_template_id: string;
  name?: string;
  params?: Record<string, unknown>;
}

export interface SettingsResponse {
  max_concurrent_stocks: number;
  total_capital: number;
  max_daily_loss_pct: number;
  order_confirm_small: number;
  order_confirm_large: number;
  enable_auto_trading: boolean;
  enable_multi_execution_per_stock?: boolean;
}

// ── Execution API helpers ──

export const executionsApi = {
  list: (stockId: string): Promise<ExecutionInfo[]> =>
    api.get(`/stocks/${stockId}/executions`),

  create: (body: CreateExecutionRequest): Promise<ExecutionInfo> =>
    api.post(`/stocks/${body.stock_id}/executions`, body),

  remove: (stockId: string, executionId: string): Promise<null> =>
    api.delete(`/stocks/${stockId}/executions/${executionId}`),

  performance: (executionId: string): Promise<ExecutionPerformance> =>
    api.get(`/monitor/executions/${executionId}/performance`),
};
