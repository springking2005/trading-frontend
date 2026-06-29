const BASE = '/api/v1';

function token(): string | null { return localStorage.getItem('token'); }

function tryParseJson(text: string): unknown {
  return JSON.parse(text);
}

function normalizeErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
  }
  return fallback;
}

async function request(method: string, path: string, body?: unknown): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });

  const contentType = res.headers.get('content-type') || '';
  const rawBody = res.status === 204 ? '' : await res.text();

  // Auth endpoints (login/register/refresh) return 401 for bad credentials.
  // Let the real backend detail (e.g. "Invalid credentials") surface instead
  // of masking it as "登录已过期". Only protected-endpoint 401s should be
  // treated as an expired session.
  const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh');
  if (res.status === 401 && !isAuthEndpoint) {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    if (window.location.hash !== '#/login') {
      window.location.hash = '#/login';
    }
    throw new Error('登录已过期，请重新登录');
  }

  if (res.status === 204) return null;

  let data: unknown = null;
  if (rawBody) {
    const looksJson = contentType.includes('application/json') || contentType.includes('+json');
    if (looksJson) {
      try {
        data = tryParseJson(rawBody);
      } catch {
        data = rawBody;
      }
    } else {
      try {
        data = tryParseJson(rawBody);
      } catch {
        data = rawBody;
      }
    }
  }

  if (!res.ok) {
    throw new Error(normalizeErrorMessage(data, `Request failed (${res.status})`));
  }
  return data;
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  put: (path: string, body?: unknown) => request('PUT', path, body),
  patch: (path: string, body?: unknown) => request('PATCH', path, body),
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
  stock_id?: string;
  position_id?: string;
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
  strategy_definition_id: string;
  parameters?: Record<string, unknown>;
  name?: string;
  position_id?: string;
}

export interface SettingsResponse {
  max_concurrent_stocks: number;
  total_capital: number;
  max_daily_loss_pct: number;
  order_confirm_small: number;
  order_confirm_large: number;
  enable_auto_trading: boolean;
  enable_auto_add?: boolean;
  enable_auto_sell?: boolean;
  enable_hard_stop?: boolean;
  enable_v3_strategy_engine?: boolean;
  enable_multi_execution_per_stock?: boolean;
  futu_trade_env?: string;
}

// ── Trading Rule Types ──

export interface TradingRuleContext {
  lot_size: number;
  min_order_qty: number;
  buy_step: number;
  sell_step: number;
  odd_lot_allowed: boolean;
  sellable_qty: number;
  t1_locked_qty: number;
  board_type: string;
  price_tick: number;
  status_flags: string[];
}

export interface TradingRuleSnapshot {
  symbol: string;
  context: TradingRuleContext;
  updated_at?: string;
}

// ── Execution API helpers ──

export const executionsApi = {
  list: async (stockId: string): Promise<ExecutionInfo[]> => {
    const data = await api.get(`/stocks/${stockId}/executions`);
    const items = Array.isArray(data) ? data : (data?.executions || []);
    return items.map((item: any) => ({
      id: String(item.execution_id || item.id || item.instance_id),
      name: item.name || item.definition_name || item.template_name || 'Execution',
      state: item.state || item.status || 'PENDING',
      strategy_template_name: item.strategy_template_name || item.definition_name || item.template_name,
      unrealized_pnl: item.unrealized_pnl,
      is_primary: item.is_primary,
      stock_id: item.stock_id,
      position_id: item.position_id,
      created_at: item.created_at,
    }));
  },

  create: async (body: CreateExecutionRequest): Promise<ExecutionInfo> => {
    const data = await api.post(`/stocks/${body.stock_id}/executions`, {
      strategy_definition_id: body.strategy_definition_id,
      parameters: body.parameters || {},
      position_id: body.position_id,
    });
    return {
      id: String(data.execution_id || data.id),
      name: data.name || data.definition_name || 'Execution',
      state: data.state || data.status || 'PENDING',
      strategy_template_name: data.definition_name,
      stock_id: data.stock_id,
      position_id: data.position_id,
      created_at: data.created_at,
    };
  },

  remove: (stockId: string, executionId: string): Promise<null> =>
    api.delete(`/stocks/${stockId}/executions/${executionId}`),

  performance: (executionId: string): Promise<ExecutionPerformance> =>
    api.get(`/monitor/executions/${executionId}/performance`),
};

export const tradingRulesApi = {
  snapshot: async (symbol: string): Promise<TradingRuleSnapshot> => {
    const data = await api.get(`/market/${encodeURIComponent(symbol)}/rules`);
    const context = data?.context || data?.rules || data || {};
    return {
      symbol: String(data?.symbol || symbol),
      context: {
        lot_size: Number(context.lot_size ?? context.lotSize ?? 100),
        min_order_qty: Number(context.min_order_qty ?? context.minOrderQty ?? 100),
        buy_step: Number(context.buy_step ?? context.buyStep ?? 100),
        sell_step: Number(context.sell_step ?? context.sellStep ?? 100),
        odd_lot_allowed: Boolean(context.odd_lot_allowed ?? context.oddLotAllowed ?? false),
        sellable_qty: Number(context.sellable_qty ?? context.sellableQty ?? 0),
        t1_locked_qty: Number(context.t1_locked_qty ?? context.t1LockedQty ?? 0),
        board_type: String(context.board_type ?? context.boardType ?? 'UNKNOWN'),
        price_tick: Number(context.price_tick ?? context.priceTick ?? 0.01),
        status_flags: Array.isArray(context.status_flags)
          ? context.status_flags.map((flag: unknown) => String(flag))
          : [],
      },
      updated_at: data?.updated_at || data?.updatedAt,
    };
  },
};
