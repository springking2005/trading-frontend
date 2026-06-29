import { Page } from '@playwright/test';

export const mockAccounts = [
  {
    id: 'acc-001',
    broker_name: 'Mock Broker',
    account_no_masked: '****1234',
    account_name: '主账户',
    env: 'SIMULATE',
    account_id: 'ACC1234',
    broker: 'Mock Broker',
    balance: 1000000,
    frozen: 100000,
    available: 900000,
    is_simulated: true,
  },
];

export const mockMarketSearchResult = {
  query: '600519',
  results: [
    {
      code: '600519',
      name: '贵州茅台',
      exchange: 'SSE',
      pinyin: 'gzmt',
    },
  ],
  total: 1,
};

export const mockSnapshot = {
  vt_symbol: '600519.SSE',
  last_price: 1550.0,
  bid_prices: [1549.5, 1549.0, 1548.5, 1548.0, 1547.5],
  ask_prices: [1550.5, 1551.0, 1551.5, 1552.0, 1552.5],
  bid_volumes: [100, 200, 300, 400, 500],
  ask_volumes: [100, 200, 300, 400, 500],
  limit_up: 1650,
  limit_down: 1350,
  status_flags: ['TRADING'],
  price_tick: 0.01,
  board_type: 'MAIN',
};

export const mockTradingRules = {
  lot_size: 100,
  min_order_qty: 100,
  buy_step: 100,
  sell_step: 100,
  odd_lot_allowed: false,
  sellable_qty: 300,
  t1_locked_qty: 100,
  board_type: 'MAIN',
  price_tick: 0.01,
  status_flags: ['TRADING'],
};

export const mockOpenOrders = [
  {
    id: 'ord-open-1',
    symbol: '600519',
    stock_name: '贵州茅台',
    side: 'BUY',
    order_price: 1550,
    order_volume: 100,
    filled_volume: 0,
    status: 'SUBMITTED',
    created_at: '2026-06-27T09:35:00',
    cancelable: true,
  },
  {
    id: 'ord-open-2',
    symbol: '000858',
    stock_name: '五粮液',
    side: 'SELL',
    order_price: 152.8,
    order_volume: 200,
    filled_volume: 100,
    status: 'PARTIALLY_FILLED',
    created_at: '2026-06-27T09:36:00',
    cancelable: false,
  },
];

export const mockOrderHistory = [
  {
    id: 'ord-his-1',
    symbol: '600519',
    stock_name: '贵州茅台',
    side: 'BUY',
    order_price: 1530,
    order_volume: 100,
    filled_volume: 100,
    status: 'FILLED',
    created_at: '2026-06-26T14:05:00',
  },
];

export const mockPresetOrders = [
  {
    id: 'preset-001',
    symbol: '600519',
    stock_name: '贵州茅台',
    side: 'BUY',
    order_price: 1550,
    order_volume: 100,
    trigger_type: 'manual',
    status: 'DRAFT',
    created_at: '2026-06-27T09:40:00',
  },
];

export const mockTodayTrades = [
  {
    id: 'trade-1',
    symbol: '600519',
    stock_name: '贵州茅台',
    side: 'BUY',
    trade_price: 1550,
    trade_volume: 100,
    trade_time: '2026-06-27T10:10:00',
  },
];

export const mockPositions = [
  {
    id: 'pos-001',
    vt_symbol: '600519.SSE',
    code: '600519',
    stock_name: '贵州茅台',
    name: '贵州茅台',
    status: 'ACTIVE',
    volume: 100,
    sellable_qty: 80,
    t1_locked_qty: 20,
    frozen_qty: 20,
    current_value: 250000,
    unrealized_pnl: 15000,
    pnl: 15000,
    unrealized_pnl_pct: 6.38,
    current_price: 1800.5,
    price_change_pct: 2.15,
    add_count: 2,
    max_add_count: 5,
    available_qty: 80,
    sellable_qty: 80,
    cost_price: 1700,
    strategy_name: 'Grid Pro',
    strategy_instance_id: 'inst-001',
    market_value: 250000,
    weight: 65,
  },
  {
    id: 'pos-002',
    vt_symbol: '000858.SZE',
    code: '000858',
    stock_name: '五粮液',
    name: '五粮液',
    status: 'PENDING',
    volume: 200,
    sellable_qty: 200,
    t1_locked_qty: 0,
    current_value: 120000,
    unrealized_pnl: -5000,
    pnl: -5000,
    unrealized_pnl_pct: -4.0,
    current_price: 150.2,
    price_change_pct: -1.2,
    add_count: 1,
    max_add_count: 5,
    available_qty: 200,
    cost_price: 160,
    strategy_name: 'Momentum',
    strategy_instance_id: 'inst-002',
    market_value: 120000,
    weight: 35,
  },
];

export const mockPositionDetail = {
  id: 'pos-001',
  vt_symbol: '600519.SSE',
  stock_name: '贵州茅台',
  status: 'ACTIVE',
  batches: [
    {
      id: 'lot-001',
      batch_index: 1,
      locked: true,
      entry_price: 1700.0,
      entry_volume: 100,
      entry_amount: 170000,
      entry_time: '2026-06-27T09:30:00',
      status: 'HOLDING',
      pnl: 10000,
      hard_stop_price: 1530.0,
      sellable: false,
    },
    {
      id: 'lot-002',
      batch_index: 2,
      locked: false,
      entry_price: 1690.0,
      entry_volume: 100,
      entry_amount: 169000,
      entry_time: '2026-06-27T10:15:00',
      status: 'HOLDING',
      pnl: 5000,
      sell_trigger_price: 1860.0,
      sellable: true,
    },
  ],
};

export async function setupAuthMock(page: Page) {
  await page.route(/\/api\/v1\/auth\/login/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        token_type: 'bearer',
      }),
    })
  );
}

export async function setupMarketMock(page: Page) {
  await page.route(/\/api\/v1\/accounts/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAccounts),
    })
  );
  await page.route(/\/api\/v1\/market\/search/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMarketSearchResult),
    })
  );
  await page.route(/\/api\/v1\/market\/[^/]+\/snapshot/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSnapshot),
    })
  );
  await page.route(/\/api\/v1\/market\/[^/]+\/rules/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTradingRules),
    })
  );
}

export async function setupTemplatesMock(page: Page) {
  await page.route(/\/api\/v1\/strategies\/templates/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'tpl-1',
          name: '标准网格',
          description: '标准网格交易策略',
          is_system: false,
          params: {
            base_position_amount: 100000,
            add_position_amount: 50000,
            max_add_count: 4,
            max_position_amount: 300000,
            add_trigger_pct: -3,
            sell_trigger_pct: 2,
            hard_stop_loss_pct: -10,
          },
        },
      ]),
    })
  );
}

export async function setupDashboardMock(page: Page) {
  // Dashboard data endpoint
  await page.route(/\/api\/v1\/dashboard/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        capital: {
          available: 900000,
          frozen: 100000,
          total_invested: 300000,
          current_value: 370000,
          balance: 1000000,
          usage_pct: 35,
        },
        positions: { total: 2, active: 1, cleared: 0 },
        pnl: { unrealized: 10000, realized: 2000, total: 12000 },
      }),
    })
  );

  // Settings endpoint — the dashboard calls loadSettings() on mount
  await page.route(/\/api\/v1\/settings/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        max_concurrent_stocks: 5,
        total_capital: 1000000,
        max_daily_loss_pct: 3,
        order_confirm_small: 10000,
        order_confirm_large: 200000,
        enable_auto_trading: false,
        enable_multi_execution_per_stock: false,
      }),
    })
  );

  // Positions endpoint — the dashboard calls loadDashboard() -> api.get('/positions')
  await page.route(/\/api\/v1\/positions/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: mockPositions, total: mockPositions.length }),
    })
  );
}

export async function setupOrderMock(page: Page) {
  await page.route(/\/api\/v1\/orders(\?.*)?$/, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          vt_orderid: 'ord-001',
          id: 'ord-001',
          status: 'SUBMITTED',
        }),
      });
    }
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([...mockOpenOrders, ...mockOrderHistory]),
      });
    }
    return route.continue();
  });
  await page.route(/\/api\/v1\/prefill-orders(\?.*)?$/, (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPresetOrders),
      });
    }
    if (method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'preset-002',
          status: 'DRAFT',
        }),
      });
    }
    if (method === 'DELETE') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
  await page.route(/\/api\/v1\/orders\/open/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOpenOrders),
    })
  );
  await page.route(/\/api\/v1\/orders\/history/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOrderHistory),
    })
  );
  await page.route(/\/api\/v1\/trades\/today/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTodayTrades),
    })
  );
}

export async function setupAllMocks(page: Page) {
  await setupAuthMock(page);
  await setupMarketMock(page);
  await setupTemplatesMock(page);
  await setupDashboardMock(page);
  await setupOrderMock(page);
}
