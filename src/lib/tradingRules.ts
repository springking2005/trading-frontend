export type TradingOrderSide = 'buy' | 'sell';

export type TradingPresetKey = 'half' | 'third' | 'quarter' | 'all';

export type TradingStatusFlag =
  | 'HALTED'
  | 'SUSPENDED'
  | 'LIMIT_UP'
  | 'LIMIT_DOWN'
  | 'AUCTION'
  | 'LOCKED'
  | 'TRADING'
  | (string & {});

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
  status_flags: readonly TradingStatusFlag[];
}

export interface TradingRuleIssue {
  code: string;
  message: string;
  suggestion?: string;
  level?: 'error' | 'warning';
}

export interface TradingQuantityValidationResult {
  valid: boolean;
  issues: TradingRuleIssue[];
  suggested_quantity: number | null;
  reference_lots: number | null;
}

export interface TradingPriceValidationResult {
  valid: boolean;
  issues: TradingRuleIssue[];
  suggested_price: number | null;
}

export interface TradingQuantityPresetRecommendation {
  key: TradingPresetKey;
  label: '1/2' | '1/3' | '1/4' | '全部';
  ratio: number;
  quantity: number;
  reference_lots: number;
  valid: boolean;
  reason?: string;
}

export interface TradingRuleSummary {
  share_reference: string;
  is_halted: boolean;
  is_suspended: boolean;
  is_limit_up: boolean;
  is_limit_down: boolean;
  messages: string[];
}

const DEFAULT_CONTEXT: TradingRuleContext = {
  lot_size: 100,
  min_order_qty: 100,
  buy_step: 1,           // step is the tick size, not lot size — defaults to 1 share
  sell_step: 1,
  odd_lot_allowed: false,
  sellable_qty: 0,
  t1_locked_qty: 0,
  board_type: 'UNKNOWN',
  price_tick: 0.01,
  status_flags: [],
};

const PRESET_DEFINITIONS: Array<{
  key: TradingPresetKey;
  label: TradingQuantityPresetRecommendation['label'];
  ratio: number;
}> = [
  { key: 'half', label: '1/2', ratio: 0.5 },
  { key: 'third', label: '1/3', ratio: 1 / 3 },
  { key: 'quarter', label: '1/4', ratio: 0.25 },
  { key: 'all', label: '全部', ratio: 1 },
];

const EPSILON = 1e-8;

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positiveIntegerOrFallback(value: unknown, fallback: number): number {
  const n = Math.trunc(asFiniteNumber(value, fallback));
  return n > 0 ? n : fallback;
}

function booleanOrFallback(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArrayOrFallback(value: unknown, fallback: readonly TradingStatusFlag[]): readonly TradingStatusFlag[] {
  if (!Array.isArray(value)) return fallback;
  const flags = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean) as TradingStatusFlag[];
  return flags.length ? flags : fallback;
}

export function normalizeTradingRuleContext(
  value: Partial<TradingRuleContext> | Record<string, unknown>,
): TradingRuleContext {
  const raw = value as Partial<TradingRuleContext> & Record<string, unknown>;
  return {
    lot_size: positiveIntegerOrFallback(raw.lot_size, DEFAULT_CONTEXT.lot_size),
    min_order_qty: positiveIntegerOrFallback(raw.min_order_qty, DEFAULT_CONTEXT.min_order_qty),
    buy_step: positiveIntegerOrFallback(raw.buy_step, DEFAULT_CONTEXT.buy_step),
    sell_step: positiveIntegerOrFallback(raw.sell_step, DEFAULT_CONTEXT.sell_step),
    odd_lot_allowed: booleanOrFallback(raw.odd_lot_allowed, DEFAULT_CONTEXT.odd_lot_allowed),
    sellable_qty: positiveIntegerOrFallback(raw.sellable_qty, DEFAULT_CONTEXT.sellable_qty),
    t1_locked_qty: positiveIntegerOrFallback(raw.t1_locked_qty, DEFAULT_CONTEXT.t1_locked_qty),
    board_type: stringOrFallback(raw.board_type, DEFAULT_CONTEXT.board_type),
    price_tick: asFiniteNumber(raw.price_tick, DEFAULT_CONTEXT.price_tick) > 0
      ? asFiniteNumber(raw.price_tick, DEFAULT_CONTEXT.price_tick)
      : DEFAULT_CONTEXT.price_tick,
    status_flags: stringArrayOrFallback(raw.status_flags, DEFAULT_CONTEXT.status_flags),
  };
}

function countDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = value.toString().toLowerCase();
  if (text.includes('e-')) {
    const [base, exponentText] = text.split('e-');
    const exponent = Number(exponentText);
    const decimals = (base.split('.')[1]?.length ?? 0) + exponent;
    return Number.isFinite(exponent) ? decimals : 0;
  }
  return text.split('.')[1]?.length ?? 0;
}

function nearlyEqual(a: number, b: number, epsilon = EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function floorToStep(quantity: number, step: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(step) || step <= 0) return 0;
  return Math.floor(quantity / step) * step;
}

function ceilToStep(quantity: number, step: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(step) || step <= 0) return 0;
  return Math.ceil(quantity / step) * step;
}

function validQuantitySuggestion(quantity: number, minOrderQty: number, step: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const floored = floorToStep(quantity, step);
  if (floored >= minOrderQty && floored > 0) return floored;

  const minimumAligned = ceilToStep(minOrderQty, step);
  if (minimumAligned > 0) return minimumAligned;

  return floorToStep(minOrderQty > 0 ? minOrderQty : quantity, step);
}

function stepIssue(
  quantity: number,
  step: number,
  minOrderQty: number,
  kind: 'buy' | 'sell',
  context?: TradingRuleContext,
): TradingRuleIssue | null {
  if (!isPositiveInteger(quantity)) return null;
  if (quantity < minOrderQty) {
    if (kind === 'sell' && context?.odd_lot_allowed && quantity === context.sellable_qty && quantity > 0) {
      return null;
    }
    const suggestion = validQuantitySuggestion(quantity, minOrderQty, step);
    return {
      code: `${kind.toUpperCase()}_MIN_ORDER_QTY`,
      message: `数量低于最小委托量 ${minOrderQty} 股`,
      level: 'error',
      suggestion: suggestion > 0 ? `建议改为 ${suggestion} 股` : undefined,
    };
  }
  if (step > 0 && quantity % step !== 0) {
    const suggestion = validQuantitySuggestion(quantity, minOrderQty, step);
    return {
      code: `${kind.toUpperCase()}_STEP_MISMATCH`,
      message: `数量必须按 ${step} 股步进`,
      level: 'error',
      suggestion: suggestion > 0 ? `建议改为 ${suggestion} 股` : undefined,
    };
  }
  return null;
}

function validateQuantityBase(
  quantity: number,
  context: TradingRuleContext,
  kind: 'buy' | 'sell',
): TradingQuantityValidationResult {
  const issues: TradingRuleIssue[] = [];
  if (!isPositiveInteger(quantity)) {
    issues.push({
      code: `${kind.toUpperCase()}_INVALID_QUANTITY`,
      message: '数量必须为大于 0 的整数股数',
    });
    return {
      valid: false,
      issues,
      suggested_quantity: null,
      reference_lots: null,
    };
  }

  const minOrderQty = Math.max(1, context.min_order_qty);
  const step = Math.max(1, kind === 'buy' ? context.buy_step : context.sell_step);
  const stepError = stepIssue(quantity, step, minOrderQty, kind, context);
  if (stepError) issues.push(stepError);

  const suggested_quantity = issues.length ? validQuantitySuggestion(quantity, minOrderQty, step) : quantity;
  return {
    valid: issues.length === 0,
    issues,
    suggested_quantity: suggested_quantity > 0 ? suggested_quantity : null,
    reference_lots: context.lot_size > 0 ? quantity / context.lot_size : null,
  };
}

function appendStatusWarnings(context: TradingRuleContext, issues: TradingRuleIssue[]): void {
  const flags = new Set(context.status_flags.map((flag) => String(flag).toUpperCase()));
  if (flags.has('HALTED') || flags.has('SUSPENDED')) {
    issues.push({
      code: 'STATUS_HALTED',
      message: '标的当前停牌/暂停交易',
      level: 'error',
    });
  }
  if (flags.has('LIMIT_UP')) {
    issues.push({
      code: 'STATUS_LIMIT_UP',
      message: '标的处于涨停状态，买入可能受限',
      level: 'warning',
    });
  }
  if (flags.has('LIMIT_DOWN')) {
    issues.push({
      code: 'STATUS_LIMIT_DOWN',
      message: '标的处于跌停状态，卖出可能受限',
      level: 'warning',
    });
  }
}

export function validateBuyOrder(input: {
  quantity: number;
  price?: number;
  available_cash?: number;
  context: TradingRuleContext;
}): TradingQuantityValidationResult {
  const context = normalizeTradingRuleContext(input.context);
  const result = validateQuantityBase(input.quantity, context, 'buy');
  appendStatusWarnings(context, result.issues);

  if (input.price != null) {
    const priceResult = validatePriceTick(input.price, context.price_tick);
    if (!priceResult.valid) result.issues.push(...priceResult.issues);
  }

  if (typeof input.price === 'number' && Number.isFinite(input.price) && input.price > 0 && typeof input.available_cash === 'number') {
    const estimatedCost = input.quantity * input.price;
    if (input.available_cash + EPSILON < estimatedCost) {
      result.issues.push({
        code: 'BUY_INSUFFICIENT_CASH',
        message: '可用资金不足以覆盖当前买入数量',
        suggestion: `预计需要约 ${estimatedCost.toFixed(2)} 元，可用 ${input.available_cash.toFixed(2)} 元`,
      });
    }
  }

  return {
    valid: result.valid && result.issues.every((issue) => issue.level !== 'error'),
    issues: result.issues,
    suggested_quantity: result.suggested_quantity,
    reference_lots: result.reference_lots,
  };
}

export function validateSellOrder(input: {
  quantity: number;
  price?: number;
  context: TradingRuleContext;
}): TradingQuantityValidationResult {
  const context = normalizeTradingRuleContext(input.context);
  const result = validateQuantityBase(input.quantity, context, 'sell');
  appendStatusWarnings(context, result.issues);

  if (input.price != null) {
    const priceResult = validatePriceTick(input.price, context.price_tick);
    if (!priceResult.valid) result.issues.push(...priceResult.issues);
  }

  if (context.sellable_qty >= 0 && input.quantity > context.sellable_qty) {
    const locked = Math.max(0, context.t1_locked_qty);
    result.issues.push({
      code: 'SELL_EXCEEDS_SELLABLE',
      message: `可卖数量不足，仅剩 ${context.sellable_qty} 股可卖`,
      suggestion:
        locked > 0
          ? `其中 ${locked} 股处于 T+1 冻结，建议最多卖出 ${context.sellable_qty} 股`
          : `建议改为 ${context.sellable_qty} 股`,
    });
  }

  return {
    valid: result.valid && result.issues.every((issue) => issue.level !== 'error'),
    issues: result.issues,
    suggested_quantity: result.suggested_quantity,
    reference_lots: result.reference_lots,
  };
}

export function validatePriceTick(price: number, priceTick: number): TradingPriceValidationResult {
  const issues: TradingRuleIssue[] = [];
  if (!Number.isFinite(price) || price <= 0) {
    issues.push({
      code: 'PRICE_INVALID',
      message: '价格必须为大于 0 的数值',
    });
    return { valid: false, issues, suggested_price: null };
  }
  if (!Number.isFinite(priceTick) || priceTick <= 0) {
    issues.push({
      code: 'PRICE_TICK_INVALID',
      message: '价格 tick 缺失或非法',
    });
    return { valid: false, issues, suggested_price: null };
  }

  const ticks = price / priceTick;
  const nearest = Math.round(ticks);
  const aligned = nearlyEqual(ticks, nearest);
  if (!aligned) {
    const decimals = Math.max(countDecimals(priceTick), 0);
    const suggestedPrice = Number((nearest * priceTick).toFixed(decimals));
    issues.push({
      code: 'PRICE_TICK_MISMATCH',
      message: `价格必须按 ${priceTick} 的最小 tick 变动`,
      suggestion: `建议改为 ${suggestedPrice}`,
    });
    return { valid: false, issues, suggested_price: suggestedPrice };
  }

  return { valid: true, issues, suggested_price: price };
}

function computePresetQuantity(baseQuantity: number, ratio: number, step: number, minOrderQty: number): number {
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0 || !Number.isFinite(ratio) || ratio <= 0) return 0;
  const raw = Math.floor(baseQuantity * ratio);
  const stepped = floorToStep(raw, step);
  if (stepped >= minOrderQty) return stepped;
  const alignedMinimum = ceilToStep(minOrderQty, step);
  return alignedMinimum > 0 && alignedMinimum <= baseQuantity ? alignedMinimum : 0;
}

function recommendPresetQuantities(
  baseQuantity: number,
  context: TradingRuleContext,
  kind: 'buy' | 'sell',
): TradingQuantityPresetRecommendation[] {
  const step = Math.max(1, kind === 'buy' ? context.buy_step : context.sell_step);
  const minOrderQty = Math.max(1, context.min_order_qty);
  return PRESET_DEFINITIONS.map((preset) => {
    const quantity = preset.key === 'all'
      ? floorToStep(baseQuantity, step)
      : computePresetQuantity(baseQuantity, preset.ratio, step, minOrderQty);
    const valid = quantity > 0 && quantity >= minOrderQty && quantity <= baseQuantity && quantity % step === 0;
    return {
      key: preset.key,
      label: preset.label,
      ratio: preset.ratio,
      quantity,
      reference_lots: context.lot_size > 0 ? quantity / context.lot_size : 0,
      valid,
      reason: valid ? undefined : '当前数量不足以生成合法推荐值',
    };
  });
}

export function recommendBuyQuantities(availableCash: number, price: number, context: TradingRuleContext): TradingQuantityPresetRecommendation[] {
  const normalized = normalizeTradingRuleContext(context);
  if (!Number.isFinite(availableCash) || availableCash <= 0 || !Number.isFinite(price) || price <= 0) {
    return PRESET_DEFINITIONS.map((preset) => ({
      key: preset.key,
      label: preset.label,
      ratio: preset.ratio,
      quantity: 0,
      reference_lots: 0,
      valid: false,
      reason: '可用资金或价格无效',
    }));
  }

  const affordableQuantity = Math.floor(availableCash / price);
  const step = Math.max(1, normalized.buy_step);
  const minimum = Math.max(1, normalized.min_order_qty);
  return recommendPresetQuantities(affordableQuantity, normalized, 'buy').map((preset) => {
    if (preset.key === 'all') {
      const quantity = floorToStep(affordableQuantity, step);
      const valid = quantity >= minimum;
      return {
        ...preset,
        quantity,
        reference_lots: normalized.lot_size > 0 ? quantity / normalized.lot_size : 0,
        valid,
        reason: valid ? undefined : '全部可用资金不足以满足最小委托量',
      };
    }
    return preset;
  });
}

export function recommendSellQuantities(sellableQty: number, context: TradingRuleContext): TradingQuantityPresetRecommendation[] {
  const normalized = normalizeTradingRuleContext(context);
  if (!Number.isFinite(sellableQty) || sellableQty <= 0) {
    return PRESET_DEFINITIONS.map((preset) => ({
      key: preset.key,
      label: preset.label,
      ratio: preset.ratio,
      quantity: 0,
      reference_lots: 0,
      valid: false,
      reason: '可卖数量不足',
    }));
  }
  return recommendPresetQuantities(sellableQty, normalized, 'sell').map((preset) => ({
    ...preset,
    reason: preset.valid ? undefined : preset.reason,
  }));
}

export function getTradingRuleSummary(context: TradingRuleContext): TradingRuleSummary {
  const normalized = normalizeTradingRuleContext(context);
  const flags = new Set(normalized.status_flags.map((flag) => String(flag).toUpperCase()));
  const isHalted = flags.has('HALTED') || flags.has('SUSPENDED');
  const isLimitUp = flags.has('LIMIT_UP');
  const isLimitDown = flags.has('LIMIT_DOWN');
  const messages: string[] = [];

  if (isHalted) messages.push('标的停牌/暂停交易');
  if (isLimitUp) messages.push('标的涨停，买入可能受限');
  if (isLimitDown) messages.push('标的跌停，卖出可能受限');
  if (normalized.sellable_qty < normalized.t1_locked_qty) {
    messages.push(`T+1 冻结 ${normalized.t1_locked_qty} 股`);
  }
  if (normalized.board_type && normalized.board_type !== 'UNKNOWN') {
    messages.push(`板块：${normalized.board_type}`);
  }

  return {
    share_reference: normalized.lot_size > 0 ? `约 ${normalized.lot_size} 股 / 1 手` : '手数参考不可用',
    is_halted: isHalted,
    is_suspended: isHalted,
    is_limit_up: isLimitUp,
    is_limit_down: isLimitDown,
    messages,
  };
}

export function formatShareReference(shares: number, lotSize: number): string {
  if (!Number.isFinite(shares) || shares <= 0 || !Number.isFinite(lotSize) || lotSize <= 0) return '--';
  const lots = shares / lotSize;
  return Number.isInteger(lots) ? `约 ${lots} 手` : `约 ${lots.toFixed(2)} 手`;
}

export function clampToValidQuantity(quantity: number, context: TradingRuleContext, side: TradingOrderSide): number {
  const normalized = normalizeTradingRuleContext(context);
  const minOrderQty = Math.max(1, normalized.min_order_qty);
  const step = Math.max(1, side === 'buy' ? normalized.buy_step : normalized.sell_step);
  return validQuantitySuggestion(quantity, minOrderQty, step);
}
