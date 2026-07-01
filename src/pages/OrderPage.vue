<template>
  <div class="trading-workbench">
    <header class="card workbench-header">
      <div class="workbench-header__title">
        <div class="workbench-header__eyebrow">
          <span class="badge">交易工作台</span>
          <span class="text-muted">P0 主闭环</span>
        </div>
        <h2>交易工作台</h2>
        <p class="text-muted">买入、卖出、撤单、持仓、查询统一入口；数量主单位为股，手只作参考。</p>
      </div>

      <div class="workbench-header__context">
        <div class="context-chip">
          <span class="text-muted">券商 / 账号</span>
          <select v-model="currentAccountId" class="select-field" style="font-size:0.85rem;padding:0.25rem 0.5rem" @change="onAccountSwitch">
            <option v-for="acct in accountRows" :key="acct.id" :value="acct.id">
              {{ acct.broker }} · {{ maskAccountId(acct.account_id) }}
              {{ acct.is_primary ? '★' : '' }}
              ¥{{ Math.round(acct.available).toLocaleString() }}
            </option>
          </select>
        </div>
        <div class="context-chip context-chip--search">
          <span class="text-muted">搜索</span>
          <input
            v-model="searchQuery"
            class="input-field"
            data-testid="order-search"
            placeholder="代码 / 名称 / 拼音"
            @input="onSearchInput"
            @focus="showDropdown = searchResults.length > 0"
            @blur="onSearchBlur"
          />
          <div v-if="showDropdown && searchResults.length > 0" class="search-dropdown" data-testid="order-search-results">
            <button
              v-for="r in searchResults"
              :key="`${r.code}-${r.exchange}`"
              class="search-item"
              @mousedown.prevent="selectStock(r)"
            >
              <span class="search-item__main">{{ r.code }} {{ r.name }}</span>
              <span class="badge badge-muted">{{ r.exchange }}</span>
            </button>
          </div>
          <div v-else-if="searchLoading" class="text-muted helper-text">搜索中...</div>
        </div>
        <div class="context-actions">
          <button class="btn btn-outline btn-sm" @click="refreshWorkbench">刷新</button>
          <button class="btn btn-outline btn-sm" @click="showHelp = !showHelp">帮助</button>
          <a class="btn btn-outline btn-sm" href="/#/dashboard" target="_blank" rel="noreferrer" data-testid="workbench-external-link">外跳</a>
          <button class="btn btn-outline btn-sm" @click="openSettings">设置</button>
        </div>
      </div>
    </header>

    <div v-if="showHelp" class="card workbench-note">
      <strong>工作台说明</strong>
      <p class="text-muted">普通快速买卖默认不依赖策略；如需接管，可在买入中开启策略绑定，或在持仓中进入策略接管。</p>
    </div>

    <div class="card tab-card">
      <div class="tab-bar" role="tablist" aria-label="交易工作台标签">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          :data-testid="`workbench-tab-${tab.key}`"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="workbench-layout">
      <section class="workbench-main">
        <template v-if="activeTab === 'buy'">
          <div class="card action-card">
            <div class="card-head">
              <div>
                <h3>买入</h3>
                <p class="text-muted">支持快速买入；策略绑定为可选开关。</p>
              </div>
              <span class="badge badge-muted">股数主输入</span>
            </div>

            <div v-if="selectedStock" class="security-banner quote-bar" data-testid="quote-bar">
              <div>
                <strong>{{ selectedStock.code }} {{ selectedStock.name }}</strong>
                <div class="text-muted">{{ selectedStock.exchange }} · {{ selectedStock.pinyin || '无拼音' }}</div>
              </div>
              <div class="quote-summary">
                <span>现价</span>
                <strong :class="priceDeltaClass">{{ formatMoney(currentPrice) }}</strong>
                <span class="text-muted">{{ quoteHint }}</span>
              </div>
            </div>

            <div class="grid-2">
              <div class="input-group">
                <label>买入价格</label>
                <div class="step-input">
                  <button class="step-btn" @click="adjustBuyPrice(-priceTick)">-</button>
                  <input v-model="buyPriceInput" class="input-field step-input__field" data-testid="order-buy-price" type="number" min="0" step="0.01" />
                  <button class="step-btn" @click="adjustBuyPrice(priceTick)">+</button>
                </div>
              </div>
              <div class="input-group">
                <label>买入数量（股）</label>
                <div class="step-input">
                  <button class="step-btn" @click="adjustBuyShares(-buyStep)">-</button>
                  <input
                    v-model="buySharesInput"
                    class="input-field step-input__field"
                    data-testid="order-buy-shares"
                    data-legacy-testid="order-amount"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    @input="sanitizeSharesInput('buy')"
                  />
                  <button class="step-btn" @click="adjustBuyShares(buyStep)">+</button>
                </div>
                <div class="helper-text text-muted" data-testid="buy-share-reference">{{ buyLotsText }}；每手参考 {{ lotSize }} 股</div>
              </div>
            </div>

            <div class="quick-actions buy-presets">
              <button v-for="preset in buyPresets" :key="preset.key" class="btn btn-outline btn-sm" :disabled="!preset.valid" :title="preset.detail" @click="setBuyPreset(preset)">
                {{ preset.displayLabel }}
              </button>
              <button class="btn btn-outline btn-sm" @click="setBuyShares(0)">清空</button>
            </div>
            <div class="helper-text text-muted preset-hints" data-testid="buy-preset-hints">
              <span v-for="preset in buyPresets" :key="`hint-${preset.key}`">{{ preset.displayLabel }}：{{ preset.detail }}</span>
            </div>

            <div class="switch-row">
              <div>
                <strong>策略绑定</strong>
                <div class="text-muted">默认关闭；开启后可选择模板，不影响普通快速下单。</div>
              </div>
              <button
                class="toggle"
                data-testid="buy-strategy-toggle"
                :class="{ active: strategyBindingEnabled }"
                @click="strategyBindingEnabled = !strategyBindingEnabled"
              />
            </div>

            <div v-if="strategyBindingEnabled" class="input-group">
              <label>策略模板</label>
              <select v-model="selectedTemplateId" class="select-field" data-testid="buy-strategy-template">
                <option value="">不绑定策略</option>
                <option v-for="t in templates" :key="t.id" :value="t.id">
                  {{ t.name }}{{ t.is_system ? '（系统）' : '' }}
                </option>
              </select>
            </div>

            <!-- ═══ 多账号拆分下单 ═══ -->
            <div class="switch-row" style="margin-top:1rem">
              <div>
                <strong>多账号同步下单</strong>
                <div class="text-muted">一票多账号，同步派发至各券商，互不影响</div>
              </div>
              <button
                class="toggle"
                :class="{ active: multiAccountMode }"
                @click="multiAccountMode = !multiAccountMode; if (!multiAccountMode) multiResult = null"
                data-testid="multi-account-toggle"
              />
            </div>

            <template v-if="multiAccountMode">
              <div class="input-group">
                <label>选择账号</label>
                <div class="checkbox-group">
                  <label v-for="acct in accountRows" :key="acct.id" class="checkbox-label">
                    <input
                      type="checkbox"
                      :value="acct.account_id"
                      v-model="selectedAccountIds"
                      :disabled="!acct.is_active"
                    />
                    <span>
                      {{ acct.broker }}
                      <span v-if="acct.is_primary" class="badge">主</span>
                      · {{ maskAccountId(acct.account_id) }}
                      <span class="text-muted">可用 ¥{{ Math.round(acct.available).toLocaleString() }}</span>
                    </span>
                  </label>
                </div>
              </div>

              <div class="input-group">
                <label>分配策略</label>
                <select v-model="allocatorName" class="select-field" data-testid="multi-allocator">
                  <option value="even">均分</option>
                  <option value="weighted">按余额权重</option>
                  <option value="by_funds">按可用资金</option>
                  <option value="manual">手动指定</option>
                  <option value="follow_main">跟随主账号</option>
                </select>
              </div>

              <!-- 跟随主账号 / 均分 / 权重 / 按资金：统一输入 -->
              <div v-if="allocatorName !== 'manual'" class="grid-2">
                <div class="input-group">
                  <label>{{ allocatorName === 'follow_main' ? '每账号数量（股）' : '总数量（股）' }}</label>
                  <input
                    v-model="multiVolumeInput"
                    class="input-field"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    @input="sanitizeMultiVolume()"
                    data-testid="multi-volume"
                  />
                  <div class="helper-text text-muted">
                    {{ allocatorName === 'follow_main' ? '各账号下单数量相同' : '系统按策略切分至各账号' }}
                  </div>
                </div>
              </div>

              <!-- 手动指定 -->
              <div v-else class="input-group">
                <label>逐账号数量（股）</label>
                <div v-for="acct in accountRows" :key="'man-' + acct.id" class="grid-2">
                  <span>{{ acct.broker }} · {{ maskAccountId(acct.account_id) }}</span>
                  <input
                    v-model.number="multiManualVolumes[acct.account_id]"
                    class="input-field"
                    type="text"
                    inputmode="numeric"
                    :placeholder="'0'"
                    @input="sanitizeManualVolume(acct.account_id)"
                  />
                </div>
              </div>

              <div v-if="multiPreview.length" class="summary-grid">
                <div v-for="prev in multiPreview" :key="prev.account_id" class="summary-item">
                  <span class="text-muted">{{ prev.broker }} {{ maskAccountId(prev.account_id) }}</span>
                  <strong>{{ prev.volume }} 股 · ¥{{ Math.round(prev.amount).toLocaleString() }}</strong>
                </div>
              </div>

              <div v-if="multiResult" class="warning-box" style="background:rgba(30,173,111,0.08);border-color:rgba(30,173,111,0.2)">
                <div><strong>父单</strong> {{ multiResult.parent?.status }} · 总量 {{ multiResult.parent?.volume }} 股</div>
                <div v-for="child in multiResult.children" :key="child.id" style="margin-top:0.25rem">
                  {{ child.account_id }}: <strong>{{ child.status }}</strong>
                  <span v-if="child.error_msg" class="text-warning"> — {{ child.error_msg }}</span>
                </div>
                <div v-if="multiResult.errors?.length" v-for="err in multiResult.errors" :key="err" class="text-warning">⚠ {{ err }}</div>
              </div>

              <div class="action-footer">
                <span class="text-muted">多账号下单需选择至少 2 个活跃账号</span>
                <button
                  class="btn btn-primary"
                  :disabled="!canSubmitMulti || multiSubmitting"
                  @click="submitMultiAccount"
                  data-testid="multi-submit"
                >
                  {{ multiSubmitting ? '提交中...' : '多账号下单' }}
                </button>
              </div>
            </template>

            <div class="summary-grid">
              <div class="summary-item">
                <span class="text-muted">预计金额</span>
                <strong>¥{{ formatMoney(buyAmount) }}</strong>
              </div>
              <div class="summary-item">
                <span class="text-muted">手续费</span>
                <strong>¥{{ formatMoney(feeAmount) }}</strong>
              </div>
              <div class="summary-item">
                <span class="text-muted">约合手数</span>
                <strong>{{ buyLotsText }}</strong>
              </div>
              <div class="summary-item">
                <span class="text-muted">规则提示</span>
                <strong>{{ ruleHint }}</strong>
              </div>
            </div>

            <div v-if="buyWarnings.length" class="warning-box">
              <div v-for="warning in buyWarnings" :key="warning" class="text-warning">⚠ {{ warning }}</div>
            </div>

            <div class="action-footer">
              <span class="text-muted">风险提示：{{ riskHint }}</span>
              <button class="btn btn-primary" data-testid="order-buy-submit" :disabled="!canSubmitBuy || submitting || multiAccountMode" @click="submitBuy">
                {{ submitting ? '提交中...' : '确认买入' }}
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'sell'">
          <div class="card action-card">
            <div class="card-head">
              <div>
                <h3>卖出</h3>
                <p class="text-muted">可从持仓带入；主输入为股数，可卖 / T+1 冻结明确可见。</p>
              </div>
              <span class="badge badge-muted">可卖校验</span>
            </div>

            <div class="grid-2">
              <div class="input-group">
                <label>卖出标的</label>
                <select v-model="selectedPositionId" class="select-field" data-testid="order-sell-position" @change="syncSellFromPosition">
                  <option value="">手动选择 / 输入</option>
                  <option v-for="position in positions" :key="position.id" :value="position.id">
                    {{ position.code }} {{ position.name }}
                  </option>
                </select>
              </div>
              <div class="input-group">
                <label>卖出数量（股）</label>
                <div class="step-input">
                  <button class="step-btn" @click="adjustSellShares(-sellStep)">-</button>
                  <input
                    v-model="sellSharesInput"
                    class="input-field step-input__field"
                    data-testid="order-sell-shares"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    @input="sanitizeSharesInput('sell')"
                  />
                  <button class="step-btn" @click="adjustSellShares(sellStep)">+</button>
                </div>
                <div class="helper-text text-muted" data-testid="sell-share-reference">可卖 {{ sellableQty }} 股 · 冻结 {{ t1LockedQty }} 股 · {{ sellLotsText }}</div>
              </div>
            </div>

            <div class="quick-actions">
              <button v-for="preset in sellPresets" :key="preset.key" class="btn btn-outline btn-sm" :disabled="!preset.valid" :title="preset.detail" @click="setSellPreset(preset)">
                {{ preset.displayLabel }}
              </button>
            </div>

            <div class="summary-grid">
              <div class="summary-item"><span class="text-muted">持仓数量</span><strong>{{ positionVolumeText }}</strong></div>
              <div class="summary-item"><span class="text-muted">成本价</span><strong>{{ formatMoney(costPrice) }}</strong></div>
              <div class="summary-item"><span class="text-muted">现价</span><strong>{{ formatMoney(currentPrice) }}</strong></div>
              <div class="summary-item"><span class="text-muted">盈亏</span><strong :class="positionPnl >= 0 ? 'text-down' : 'text-up'">¥{{ formatMoney(Math.abs(positionPnl)) }}</strong></div>
            </div>

            <div v-if="sellWarnings.length" class="warning-box">
              <div v-for="warning in sellWarnings" :key="warning" class="text-warning">⚠ {{ warning }}</div>
            </div>

            <div class="action-footer">
              <span class="text-muted">卖出提示：{{ sellRuleHint }}</span>
              <button class="btn btn-primary" :disabled="!canSubmitSell || submitting" @click="submitSell">
                {{ submitting ? '提交中...' : '确认卖出' }}
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'cancel'">
          <div class="card action-card">
            <div class="card-head">
              <div>
                <h3>撤单</h3>
                <p class="text-muted">撤单记录保留可追溯；当前仅展示可撤委托与空态。</p>
              </div>
              <span class="badge badge-muted">P0 字段</span>
            </div>

            <div v-if="openOrders.length" class="table-list" data-testid="order-open-orders">
              <div class="table-head">
                <span>委托时间</span><span>证券</span><span>方向</span><span>委托价</span><span>委托量</span><span>已成量</span><span>状态</span><span>操作</span>
              </div>
              <div v-for="order in openOrders" :key="order.id" class="table-row">
                <span>{{ order.time }}</span>
                <span>{{ order.code }} {{ order.name }}</span>
                <span>{{ order.side }}</span>
                <span>{{ formatMoney(order.price) }}</span>
                <span>{{ order.qty }} 股</span>
                <span>{{ order.filled }} 股</span>
                <span><span class="badge badge-warning">{{ order.status }}</span></span>
                <span>
                  <button v-if="isModifiableStatus(order.status)" class="btn btn-outline btn-sm" @click="openModifyModal(order)" style="margin-right:0.4rem">修改</button>
                  <button class="btn btn-danger btn-sm" @click="cancelOrder(order.id)" :disabled="cancellingId === order.id">
                    {{ cancellingId === order.id ? '...' : '撤单' }}
                  </button>
                </span>
              </div>
              <div class="action-footer">
                <span class="text-muted">可撤状态：SUBMITTING / NOTTRADED / PARTTRADED</span>
                <button class="btn btn-outline btn-sm" @click="loadOpenOrders">刷新</button>
              </div>
            </div>
            <div v-else-if="!ordersLoading" class="empty-state">
              <strong>暂无可撤委托</strong>
              <p class="text-muted">当前没有未成交的委托单。</p>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'positions'">
          <div class="card action-card">
            <div class="card-head">
              <div>
                <h3>持仓</h3>
                <p class="text-muted">资产卡、持仓字段和单票操作入口可见；金额可隐藏。</p>
              </div>
              <button class="toggle" :class="{ active: hideAmount }" @click="hideAmount = !hideAmount" />
            </div>

            <div class="asset-grid" data-testid="order-asset-grid">
              <div v-for="item in assetCards" :key="item.label" class="summary-item">
                <span class="text-muted">{{ item.label }}</span>
                <strong>{{ hideAmount ? '***' : item.value }}</strong>
              </div>
            </div>

            <div v-if="positions.length" class="position-list" data-testid="order-position-list">
              <div v-for="position in positions" :key="position.id" class="position-card">
                <div>
                  <strong>{{ position.code }} {{ position.name }}</strong>
                  <div class="text-muted">持仓 {{ position.volume }} 股 · 可卖 {{ position.sellable }} 股 · 仓位 {{ position.weight }}% · 涨跌幅 {{ formatPercent(position.priceChangePct) }}</div>
                </div>
                <div class="position-card__metrics">
                  <span>市值 {{ formatCurrency(position.marketValue) }}</span>
                  <span :class="position.pnl >= 0 ? 'text-down' : 'text-up'">盈亏 {{ formatCurrency(position.pnl) }}</span>
                  <span>成本 {{ formatMoney(position.costPrice) }}</span>
                  <span>现价 {{ formatMoney(position.currentPrice) }}</span>
                </div>
                <div class="quick-actions">
                  <button class="btn btn-outline btn-sm" @click="loadPositionToBuy(position)">买入/加仓</button>
                  <button class="btn btn-outline btn-sm" @click="loadPositionToSell(position)">卖出/减仓</button>
                  <button class="btn btn-outline btn-sm" @click="openPositionDetail(position, 'bind')">绑定策略</button>
                  <button class="btn btn-outline btn-sm" @click="openPositionDetail(position, 'pause')">暂停/恢复</button>
                  <button class="btn btn-outline btn-sm" @click="openPositionDetail(position, 'unbind')">解绑策略</button>
                  <button class="btn btn-outline btn-sm" @click="openPositionDetail(position, 'stop-loss')">止盈止损</button>
                  <button class="btn btn-danger btn-sm" @click="openPositionDetail(position, 'clear')">一键清仓</button>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <strong>暂无持仓</strong>
              <p class="text-muted">持仓列表为空时，可从买入标签快速建仓。</p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="card action-card">
            <div class="card-head">
              <div>
                <h3>查询</h3>
                <p class="text-muted">当日 / 历史委托成交、已清仓、对账等入口统一归位。</p>
              </div>
              <div class="quick-actions">
                <button class="btn btn-outline btn-sm" @click="activeQuerySection = 'overview'">查询总览</button>
                <button class="btn btn-outline btn-sm" @click="openPresetOrders">预设委托</button>
              </div>
            </div>

            <div v-if="activeQuerySection === 'overview'">
              <!-- Query sub-tabs -->
              <div class="quick-actions" style="margin-bottom:1rem">
                <button class="btn btn-sm" :class="querySubTab === 'todayOrders' ? 'btn-primary' : 'btn-outline'" @click="querySubTab = 'todayOrders'; loadQueryOrders()">当日委托</button>
                <button class="btn btn-sm" :class="querySubTab === 'historyOrders' ? 'btn-primary' : 'btn-outline'" @click="querySubTab = 'historyOrders'; loadQueryOrders()">历史委托</button>
                <button class="btn btn-sm" :class="querySubTab === 'todayTrades' ? 'btn-primary' : 'btn-outline'" @click="querySubTab = 'todayTrades'; loadQueryOrders()">当日成交</button>
                <button class="btn btn-sm" :class="querySubTab === 'historyTrades' ? 'btn-primary' : 'btn-outline'" @click="querySubTab = 'historyTrades'; loadQueryOrders()">历史成交</button>
                <button class="btn btn-outline btn-sm" @click="syncFutuOrders" :disabled="syncingFutu">{{ syncingFutu ? '同步中...' : '从 Futu 同步' }}</button>
              </div>

              <div v-if="queryLoading" class="text-muted" style="text-align:center;padding:2rem">加载中...</div>
              <div v-else-if="queryOrders.length" class="table-list" data-testid="order-query-list">
                <div class="table-head">
                  <span>时间</span><span>证券</span><span>方向</span><span>委托价</span><span>委托量</span><span>已成量</span><span>状态</span><span>操作</span>
                </div>
                <div v-for="o in queryOrders" :key="o.id" class="table-row">
                  <span>{{ o.time || '--' }}</span>
                  <span>{{ o.code }} {{ o.name || '' }}</span>
                  <span>{{ o.side }}</span>
                  <span>{{ formatMoney(o.price) }}</span>
                  <span>{{ o.qty }} 股</span>
                  <span>{{ o.filled }} 股</span>
                  <span><span class="badge" :class="o.status === 'ALLTRADED' ? '' : 'badge-warning'">{{ o.status }}</span></span>
                  <span>
                    <button v-if="isModifiableStatus(o.status)" class="btn btn-outline btn-sm" @click="openModifyModal(o)" style="margin-right:0.4rem">修改</button>
                    <button v-if="isOpenOrderStatus(o.status)" class="btn btn-danger btn-sm" @click="cancelOrder(o.id)" :disabled="cancellingId === o.id">
                      {{ cancellingId === o.id ? '...' : '撤单' }}
                    </button>
                  </span>
                </div>
              </div>
              <div v-else-if="!queryLoading" class="empty-state">
                <strong>{{ querySubTabLabel }}为空</strong>
                <p class="text-muted">暂无符合条件的记录。</p>
              </div>
            </div>

            <div v-else class="preset-orders-panel">
              <div class="preset-orders-panel__header">
                <div>
                  <h4>预设委托</h4>
                  <p class="text-muted">预填单（P1 / 已接入后端）可管理买入/卖出记录、删除与立即提交。</p>
                </div>
                <span class="badge badge-muted">/api/v1/prefill-orders</span>
              </div>

              <div class="preset-order-layout">
                <div class="card preset-order-form">
                  <div class="card-head">
                    <h3>预设单</h3>
                    <button class="btn btn-outline btn-sm" @click="syncPresetFormFromWorkbench">带入当前上下文</button>
                  </div>

                  <div class="switch-row">
                    <div>
                      <strong>方向</strong>
                      <div class="text-muted">买入 / 卖出</div>
                    </div>
                    <div class="quick-actions">
                      <button class="btn btn-outline btn-sm" :class="{ active: presetForm.direction === 'BUY' }" @click="presetForm.direction = 'BUY'">买入</button>
                      <button class="btn btn-outline btn-sm" :class="{ active: presetForm.direction === 'SELL' }" @click="presetForm.direction = 'SELL'">卖出</button>
                    </div>
                  </div>

                  <div class="grid-2">
                    <div class="input-group">
                      <label>账户</label>
                      <select v-model="presetForm.accountId" class="select-field" data-testid="preset-account">
                        <option value="">请选择账户</option>
                        <option v-for="account in accountRows" :key="account.id" :value="account.id">
                          {{ account.broker }} · {{ maskAccountId(account.account_id) }}
                        </option>
                      </select>
                    </div>
                    <div class="input-group">
                      <label>证券</label>
                      <input v-model="presetForm.symbol" class="input-field" data-testid="preset-symbol" placeholder="代码 / 名称 / 代码.交易所" />
                    </div>
                  </div>

                  <div class="grid-2">
                    <div class="input-group">
                      <label>价格策略</label>
                      <select v-model="presetForm.priceStrategy" class="select-field" data-testid="preset-price-strategy">
                        <option v-for="item in presetPriceStrategyOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                      </select>
                    </div>
                    <div class="input-group">
                      <label>数量（股）</label>
                      <input v-model="presetForm.quantity" class="input-field" data-testid="preset-quantity" type="text" inputmode="numeric" placeholder="0" @input="sanitizePresetQuantity" />
                    </div>
                  </div>

                  <div class="grid-2">
                    <div class="input-group">
                      <label>有效期</label>
                      <select v-model="presetForm.validity" class="select-field" data-testid="preset-validity">
                        <option v-for="item in presetValidityOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                      </select>
                    </div>
                    <div class="input-group">
                      <label>生效规则</label>
                      <select v-model="presetForm.effectiveRule" class="select-field" data-testid="preset-effective-rule">
                        <option v-for="item in presetEffectiveRuleOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                      </select>
                    </div>
                  </div>

                  <label class="agreement-row">
                    <input v-model="presetForm.agreed" type="checkbox" data-testid="preset-agreement" />
                    <span>同意预设委托协议</span>
                  </label>

                  <div v-if="presetFormWarnings.length" class="warning-box">
                    <div v-for="warning in presetFormWarnings" :key="warning" class="text-warning">⚠ {{ warning }}</div>
                  </div>

                  <div class="action-footer">
                    <span class="text-muted">预设委托与普通快速买卖并行，互不影响。</span>
                    <div class="quick-actions">
                      <button class="btn btn-outline" @click="resetPresetForm">重置</button>
                      <button class="btn btn-primary" :disabled="!canSubmitPresetOrder || presetSubmitting" @click="submitPresetOrder">
                        {{ presetSubmitting ? '提交中...' : '保存预设委托' }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="card preset-order-records">
                  <div class="card-head">
                    <h3>预设记录</h3>
                    <button class="btn btn-outline btn-sm" @click="loadPresetOrders">刷新记录</button>
                  </div>

                  <div v-if="presetOrderViewModels.length" class="preset-record-list">
                    <div v-for="record in presetOrderViewModels" :key="record.id" class="preset-record-card">
                      <div class="preset-record-card__head">
                        <strong>{{ record.symbolLabel }}</strong>
                        <span class="badge" :class="record.statusBadgeClass">{{ record.statusText }}</span>
                      </div>
                      <div class="preset-record-grid">
                        <div><span class="text-muted">方向</span><strong>{{ record.directionText }}</strong></div>
                        <div><span class="text-muted">账户</span><strong>{{ record.accountText }}</strong></div>
                        <div><span class="text-muted">价格策略</span><strong>{{ record.priceStrategyText }}</strong></div>
                        <div><span class="text-muted">数量</span><strong>{{ record.quantityText }}</strong></div>
                        <div><span class="text-muted">有效期</span><strong>{{ record.validityText }}</strong></div>
                        <div><span class="text-muted">生效规则</span><strong>{{ record.effectiveRuleText }}</strong></div>
                      </div>
                      <div class="preset-record-card__foot">
                        <span class="text-muted">{{ record.createdAtText }}</span>
                        <div class="quick-actions">
                          <button class="btn btn-outline btn-sm" @click="fillFormFromPreset(record)">带入编辑</button>
                          <button class="btn btn-outline btn-sm" @click="submitPresetOrderNow(record.id)">立即提交</button>
                          <button class="btn btn-danger btn-sm" @click="deletePresetOrder(record.id)">删除</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="empty-state compact">
                    <strong>暂无预设记录</strong>
                    <p class="text-muted">先创建一条预设委托，或从当前买卖上下文一键带入。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>

      <aside class="workbench-side">
        <div class="card side-card">
          <div class="card-head">
            <h3>盘口 / 规则</h3>
            <span class="badge badge-muted">{{ currentSymbol || '未选择' }}</span>
          </div>
          <template v-if="selectedStock">
              <div class="quote-grid">
                <div><span class="text-muted">涨跌额</span><strong :class="priceDeltaClass">¥{{ priceChangeText }}</strong></div>
                <div><span class="text-muted">涨跌幅</span><strong :class="priceDeltaClass">{{ priceChangePctText }}</strong></div>
                <div><span class="text-muted">涨停</span><strong>{{ formatMoney(limitUp) }}</strong></div>
                <div><span class="text-muted">跌停</span><strong>{{ formatMoney(limitDown) }}</strong></div>
                <div><span class="text-muted">最小交易单位</span><strong>{{ lotSize }} 股</strong></div>
                <div><span class="text-muted">价格 tick</span><strong>{{ formatMoney(priceTick) }}</strong></div>
              </div>
            <div class="orderbook-grid" data-testid="orderbook-grid">
              <div class="orderbook-col">
                <strong>买盘</strong>
                <div v-for="(price, index) in bidPrices" :key="`bid-${index}`" class="orderbook-row">
                  <span>{{ 5 - index }}档</span>
                  <span>{{ formatMoney(price) }}</span>
                  <span>{{ formatVolume(bidVolumes[index]) }}股</span>
                </div>
              </div>
              <div class="orderbook-col">
                <strong>卖盘</strong>
                <div v-for="(price, index) in askPrices" :key="`ask-${index}`" class="orderbook-row">
                  <span>{{ index + 1 }}档</span>
                  <span>{{ formatMoney(price) }}</span>
                  <span>{{ formatVolume(askVolumes[index]) }}股</span>
                </div>
              </div>
            </div>
            <div class="helper-text text-muted" data-testid="rule-status-flags">{{ ruleStatus }}</div>
            <div class="warning-box">
              <div class="text-warning">⚠ {{ ruleStatus }}</div>
            </div>
          </template>
          <div v-else class="empty-state compact">
            <strong>暂无标的</strong>
            <p class="text-muted">在顶部搜索后即可查看盘口、规则和状态。</p>
          </div>
        </div>

        <div class="card side-card">
          <div class="card-head">
            <h3>策略模板</h3>
            <router-link class="text-brand" to="/strategies">模板中心</router-link>
          </div>
          <div v-if="templates.length" class="template-list">
            <div v-for="t in templates" :key="t.id" class="template-row">
              <strong>{{ t.name }}</strong>
              <span class="text-muted">{{ t.description || '可选模板' }}</span>
            </div>
          </div>
          <div v-else class="empty-state compact">
            <strong>暂无模板</strong>
            <p class="text-muted">快速下单不依赖策略；模板仅作增强层。</p>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="showModifyModal" class="modal-overlay" @click="closeModifyModal">
      <div class="modal-content" @click.stop>
        <h3>修改订单</h3>
        <div class="form-group">
          <label>当前价格</label>
          <input v-model.number="modifyForm.price" type="number" step="0.01" min="0.01" />
        </div>
        <div class="form-group">
          <label>当前数量（股）</label>
          <input v-model.number="modifyForm.volume" type="number" step="100" min="100" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeModifyModal">取消</button>
          <button class="btn btn-primary" @click="submitModify">确认修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api, toast, tradingRulesApi } from '../api/api-client';
import {
  formatShareReference,
  normalizeTradingRuleContext,
  recommendBuyQuantities,
  recommendSellQuantities,
  validateBuyOrder,
  validateSellOrder,
} from '../lib/tradingRules';

interface StockResult {
  code: string;
  name: string;
  exchange: string;
  pinyin?: string;
}

interface TemplateResult {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  params: Record<string, any>;
}

interface PositionRow {
  id: string;
  vt_symbol?: string;
  exchange?: string;
  code: string;
  name: string;
  volume: number;
  sellable: number;
  frozen: number;
  costPrice: number;
  currentPrice: number;
  pnl: number;
  marketValue: number;
  weight: number;
  priceChangePct?: number;
}

interface OrderRow {
  id: string;
  time: string;
  code: string;
  name: string;
  side: string;
  price: number;
  qty: number;
  filled: number;
  status: string;
}

interface DashboardSnapshot {
  positions?: {
    total?: number;
    active?: number;
    cleared?: number;
  };
  capital?: {
    total_invested?: number;
    current_value?: number;
    balance?: number;
    frozen?: number;
    available?: number;
    usage_pct?: number;
  };
  pnl?: {
    unrealized?: number;
    realized?: number;
    total?: number;
  };
}

interface AccountRow {
  id: string;
  broker: string;
  account_id: string;
  balance: number;
  frozen: number;
  available: number;
  is_simulated: boolean;
  is_primary?: boolean;
  is_active?: boolean;
}

const tabs = [
  { key: 'buy', label: '买入' },
  { key: 'sell', label: '卖出' },
  { key: 'cancel', label: '撤单' },
  { key: 'positions', label: '持仓' },
  { key: 'query', label: '查询' },
] as const;

const route = useRoute();
const activeTab = ref<(typeof tabs)[number]['key']>('buy');
const showHelp = ref(false);
const hideAmount = ref(false);
const searchQuery = ref('');
const searchResults = ref<StockResult[]>([]);
const searchLoading = ref(false);
const showDropdown = ref(false);
const selectedStock = ref<StockResult | null>(null);
const templates = ref<TemplateResult[]>([]);
const selectedTemplateId = ref('');
const strategyBindingEnabled = ref(false);
const buyPriceInput = ref('0');
const buySharesInput = ref('');
const sellSharesInput = ref('');
const selectedPositionId = ref('');
const openOrders = ref<OrderRow[]>([]);
const ordersLoading = ref(false);
const cancellingId = ref('');
const showModifyModal = ref(false);
const modifyForm = ref({
  orderId: '',
  price: 0,
  volume: 0,
});
const positions = ref<PositionRow[]>([]);
const dashboardSnapshot = ref<DashboardSnapshot | null>(null);
const accountRows = ref<AccountRow[]>([]);
const submitting = ref(false);
const currentAccountId = ref('');

function onAccountSwitch() {
  const acct = accountRows.value.find(a => a.id === currentAccountId.value);
  if (acct) {
    gatewayName.value = acct.broker;
  }
}

const gatewayName = ref('simulated');  // default gateway for single-account orders

// ── 多账号同步下单 ──
const multiAccountMode = ref(false);
const selectedAccountIds = ref<string[]>([]);
const allocatorName = ref<'even' | 'weighted' | 'by_funds' | 'manual' | 'follow_main'>('follow_main');
const multiPerAccountVolume = ref('');
const multiTotalVolume = ref('');
const multiManualVolumes = ref<Record<string, number>>({});
const multiResult = ref<{
  parent: any;
  children: any[];
  errors: string[];
} | null>(null);
const multiSubmitting = ref(false);

const currentPrice = ref(0);
const limitUp = ref(0);
const limitDown = ref(0);
const bidPrices = ref<number[]>([]);
const askPrices = ref<number[]>([]);
const bidVolumes = ref<number[]>([]);
const askVolumes = ref<number[]>([]);
const priceTick = ref(0.01);
const lotSize = ref(100);
const buyStep = ref(100);
const sellStep = ref(100);
const sellableQty = ref(0);
const t1LockedQty = ref(0);
const costPrice = ref(0);
const positionVolume = ref(0);
const positionPnl = ref(0);
const availableCash = ref(0);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const buyPresets = computed(() => recommendBuyQuantities(availableCash.value, buyPrice.value, tradingContext.value).map((preset) => ({
  ...preset,
  displayLabel: `${preset.label}${preset.label === '全部' ? '可用' : ' 可用'}`,
  detail: preset.valid && preset.quantity > 0
    ? `${preset.quantity} 股 · ${formatShareReference(preset.quantity, lotSize.value)}`
    : preset.reason || '暂无推荐',
  key: preset.key,
})));

const sellPresets = computed(() => recommendSellQuantities(sellableQty.value, tradingContext.value).map((preset) => ({
  ...preset,
  displayLabel: `${preset.label}${preset.label === '全部' ? '可卖' : ' 可卖'}`,
  detail: preset.valid && preset.quantity > 0
    ? `${preset.quantity} 股 · ${formatShareReference(preset.quantity, lotSize.value)}`
    : preset.reason || '暂无推荐',
  key: preset.key,
})));

// ── Query tab state ──
const querySubTab = ref<'todayOrders' | 'historyOrders' | 'todayTrades' | 'historyTrades'>('todayOrders');
const queryLoading = ref(false);
const queryOrders = ref<any[]>([]);

const querySubTabLabel = computed(() => ({
  todayOrders: '当日委托', historyOrders: '历史委托',
  todayTrades: '当日成交', historyTrades: '历史成交',
}[querySubTab.value]));

async function loadQueryOrders() {
  queryLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (querySubTab.value === 'todayOrders') {
      params.set('statuses', 'SUBMITTING,NOTTRADED,PARTTRADED');
      params.set('today', 'true');
      params.set('limit', '200');
    } else if (querySubTab.value === 'historyOrders') {
      params.set('limit', '200');
    } else if (querySubTab.value === 'todayTrades') {
      params.set('statuses', 'ALLTRADED');
      params.set('today', 'true');
      params.set('limit', '200');
    } else {
      params.set('statuses', 'ALLTRADED');
      params.set('limit', '200');
    }
    const data = await api.get(`/orders?${params.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    queryOrders.value = items.map((item: any) => ({
      id: item.id || '',
      time: item.created_at ? new Date(item.created_at).toLocaleString() : '--',
      code: (item.vt_symbol || '').split('.')[0] || item.vt_symbol || '--',
      name: item.stock_name || '',
      side: item.direction === 'LONG' ? '买入' : '卖出',
      price: Number(item.price ?? 0),
      qty: Number(item.volume ?? 0),
      filled: Number(item.traded_volume ?? 0),
      status: item.status || '--',
    }));
  } catch { queryOrders.value = []; }
  queryLoading.value = false;
}

const presetPriceStrategyOptions = [
  { value: 'LIMIT', label: '限价' },
  { value: 'MARKET', label: '市价' },
  { value: 'BEST_5', label: '五档最优' },
  { value: 'FOLLOW', label: '跟随盘口' },
];

const presetValidityOptions = [
  { value: 'DAY', label: '当日有效' },
  { value: 'SESSION', label: '盘中有效' },
  { value: 'GTC', label: '长期有效' },
  { value: 'DATE', label: '指定日期' },
];

const presetEffectiveRuleOptions = [
  { value: 'IMMEDIATE', label: '立即生效' },
  { value: 'OPEN', label: '开盘生效' },
  { value: '0900', label: '9:00 生效' },
  { value: 'MANUAL', label: '手动启用' },
];

const presetForm = ref({
  direction: 'BUY' as 'BUY' | 'SELL',
  accountId: '',
  symbol: '',
  priceStrategy: 'LIMIT',
  quantity: '',
  validity: 'DAY',
  effectiveRule: 'IMMEDIATE',
  agreed: false,
});

const presetOrders = ref<Array<{
  id: string;
  direction: string;
  account_id: string;
  symbol: string;
  name: string;
  price_strategy: string;
  quantity: number;
  validity: string;
  effective_rule: string;
  agreed: boolean;
  status: string;
  created_at: string;
}>>([]);
const activeQuerySection = ref<'overview' | 'prefill-orders'>('overview');
const presetSubmitting = ref(false);
const presetOrderViewModels = computed(() => presetOrders.value.map((record) => ({
  ...record,
  symbolLabel: record.name ? `${record.symbol} ${record.name}` : record.symbol,
  directionText: record.direction === 'SELL' ? '卖出' : '买入',
  accountText: record.account_id || '—',
  priceStrategyText: presetPriceStrategyOptions.find((item) => item.value === record.price_strategy)?.label || record.price_strategy,
  quantityText: `${record.quantity} 股`,
  validityText: presetValidityOptions.find((item) => item.value === record.validity)?.label || record.validity,
  effectiveRuleText: presetEffectiveRuleOptions.find((item) => item.value === record.effective_rule)?.label || record.effective_rule,
  statusText: record.status || '待生效',
  statusBadgeClass: record.status && record.status.includes('生效') ? 'badge-muted' : 'badge-warning',
  createdAtText: record.created_at || '未记录时间',
})));

const currentSymbol = computed(() => selectedStock.value ? `${selectedStock.value.code}.${selectedStock.value.exchange}` : '');
const presetFormQuantity = computed(() => Math.max(parseInt(presetForm.value.quantity || '0', 10) || 0, 0));
const currentPriceSafe = computed(() => currentPrice.value || 0);
const buyShares = computed(() => Math.max(parseInt(buySharesInput.value || '0', 10) || 0, 0));
const sellShares = computed(() => Math.max(parseInt(sellSharesInput.value || '0', 10) || 0, 0));
const buyPrice = computed(() => {
  const parsed = Number(buyPriceInput.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : currentPriceSafe.value;
});
const tradingContext = computed(() => normalizeTradingRuleContext({
  lot_size: lotSize.value,
  min_order_qty: lotSize.value,
  buy_step: Math.max(buyStep.value, lotSize.value),
  sell_step: Math.max(sellStep.value, lotSize.value),
  odd_lot_allowed: false,
  sellable_qty: sellableQty.value,
  t1_locked_qty: t1LockedQty.value,
  board_type: selectedStock.value?.exchange || 'UNKNOWN',
  price_tick: priceTick.value,
  status_flags: selectedStock.value ? ['TRADING'] : [],
}));
const buyValidation = computed(() => validateBuyOrder({
  quantity: buyShares.value,
  price: buyPrice.value,
  available_cash: availableCash.value > 0 ? availableCash.value : undefined,
  context: tradingContext.value,
}));
const sellValidation = computed(() => validateSellOrder({
  quantity: sellShares.value,
  price: currentPriceSafe.value > 0 ? currentPriceSafe.value : undefined,
  context: tradingContext.value,
}));
const buyAmount = computed(() => Math.round(buyShares.value * buyPrice.value));
const feeAmount = computed(() => Math.max(Math.round(buyAmount.value * 0.00025), 0));
const priceChange = computed(() => currentPriceSafe.value - (costPrice.value || currentPriceSafe.value));
const priceChangePct = computed(() => (costPrice.value > 0 ? (priceChange.value / costPrice.value) * 100 : 0));
const buyLotsText = computed(() => formatShareReference(buyShares.value, lotSize.value));
const sellLotsText = computed(() => formatShareReference(sellShares.value, lotSize.value));
const positionVolumeText = computed(() => `${positionVolume.value} 股`);
const priceDeltaClass = computed(() => (priceChange.value >= 0 ? 'text-down' : 'text-up'));
const priceChangeText = computed(() => `${priceChange.value >= 0 ? '+' : ''}${formatMoney(Math.abs(priceChange.value))}`);
const priceChangePctText = computed(() => `${priceChangePct.value >= 0 ? '+' : ''}${priceChangePct.value.toFixed(2)}%`);
const quoteHint = computed(() => {
  if (!selectedStock.value) return '先搜索标的';
  if (limitUp.value > 0 && currentPriceSafe.value >= limitUp.value) return '接近涨停';
  if (limitDown.value > 0 && currentPriceSafe.value <= limitDown.value) return '接近跌停';
  return `tick ${formatMoney(priceTick.value)} · ${selectedStock.value.exchange}`;
});
const ruleHint = computed(() => `1 手 = ${lotSize.value} 股`);
const sellRuleHint = computed(() => `可卖优先级：后端规则 > 持仓状态 > UI 推荐`);
const riskHint = computed(() => (strategyBindingEnabled.value ? '策略绑定可选，不阻断普通快速买入。' : '普通快速买入默认可用。'));
const ruleStatus = computed(() => {
  if (!selectedStock.value) return '先搜索标的再查看规则。';
  const flags = tradingContext.value.status_flags.length ? tradingContext.value.status_flags.join(' / ') : 'TRADING';
  return `价格 tick ${formatMoney(priceTick.value)}，最小下单 ${lotSize.value} 股，状态 ${flags}。`;
});

const canSubmitBuy = computed(() => !!selectedStock.value && buyShares.value > 0 && buyPrice.value > 0 && buyValidation.value.valid);
const canSubmitSell = computed(() => !!selectedPositionId.value && sellShares.value > 0 && sellValidation.value.valid);
const canSubmitPresetOrder = computed(() => !!presetForm.value.accountId
  && !!presetForm.value.symbol.trim()
  && presetFormQuantity.value > 0
  && !!presetForm.value.priceStrategy
  && !!presetForm.value.validity
  && !!presetForm.value.effectiveRule
  && presetForm.value.agreed);

const buyWarnings = computed(() => {
  const warnings: string[] = [];
  if (buyShares.value > 0 && buyShares.value % lotSize.value !== 0) {
    warnings.push(`当前输入 ${buyShares.value} 股，系统建议按 ${lotSize.value} 股步进调整。`);
  }
  if (strategyBindingEnabled.value && !selectedTemplateId.value) {
    warnings.push('已开启策略绑定，但尚未选择模板。');
  }
  for (const issue of buyValidation.value.issues) {
    if (!warnings.includes(issue.message)) warnings.push(issue.message);
    if (issue.suggestion && !warnings.includes(issue.suggestion)) warnings.push(issue.suggestion);
  }
  return warnings;
});

const sellWarnings = computed(() => {
  const warnings: string[] = [];
  if (sellShares.value > sellableQty.value) warnings.push(`超过可卖数量 ${sellableQty.value} 股。`);
  if (sellShares.value > 0 && sellShares.value % sellStep.value !== 0) {
    warnings.push(`当前输入 ${sellShares.value} 股，建议按 ${sellStep.value} 股步进调整。`);
  }
  if (t1LockedQty.value > 0) warnings.push(`T+1 冻结 ${t1LockedQty.value} 股。`);
  for (const issue of sellValidation.value.issues) {
    if (!warnings.includes(issue.message)) warnings.push(issue.message);
    if (issue.suggestion && !warnings.includes(issue.suggestion)) warnings.push(issue.suggestion);
  }
  return warnings;
});

const presetFormWarnings = computed(() => {
  const warnings: string[] = [];
  if (!presetForm.value.accountId) warnings.push('请选择账户。');
  if (!presetForm.value.symbol.trim()) warnings.push('请输入证券代码或名称。');
  if (presetFormQuantity.value <= 0) warnings.push('数量必须大于 0。');
  if (!presetForm.value.agreed) warnings.push('需勾选预设委托协议。');
  return warnings;
});

const accountSummary = computed(() => accountRows.value.reduce((acc, row) => {
  acc.balance += Number.isFinite(row.balance) ? row.balance : 0;
  acc.frozen += Number.isFinite(row.frozen) ? row.frozen : 0;
  acc.available += Number.isFinite(row.available) ? row.available : 0;
  return acc;
}, { balance: 0, frozen: 0, available: 0 }));

const positionSummary = computed(() => positions.value.reduce((acc, row) => {
  acc.marketValue += Number.isFinite(row.marketValue) ? row.marketValue : 0;
  acc.pnl += Number.isFinite(row.pnl) ? row.pnl : 0;
  acc.volume += Number.isFinite(row.volume) ? row.volume : 0;
  acc.sellable += Number.isFinite(row.sellable) ? row.sellable : 0;
  acc.frozen += Number.isFinite(row.frozen) ? row.frozen : 0;
  return acc;
}, { marketValue: 0, pnl: 0, volume: 0, sellable: 0, frozen: 0 }));

const assetCards = computed(() => {
  const capital = dashboardSnapshot.value?.capital ?? {};
  const pnl = dashboardSnapshot.value?.pnl ?? {};
  const totalMarketValue = Number.isFinite(Number(capital.current_value)) ? Number(capital.current_value) : positionSummary.value.marketValue;
  const availableCashValue = Number.isFinite(Number(capital.available)) ? Number(capital.available) : accountSummary.value.available;
  const withdrawableCashValue = Number.isFinite(Number(capital.balance)) ? Number(capital.balance) : accountSummary.value.balance;
  const totalAssets = totalMarketValue + withdrawableCashValue;
  const floatingPnl = Number.isFinite(Number(pnl.unrealized)) ? Number(pnl.unrealized) : positionSummary.value.pnl;
  const todayPnl = Number.isFinite(Number(pnl.total)) ? Number(pnl.total) : (Number.isFinite(Number(pnl.realized)) ? Number(pnl.realized) : floatingPnl);
  const usagePct = Number.isFinite(Number(capital.usage_pct))
    ? Number(capital.usage_pct)
    : (totalAssets > 0 ? (totalMarketValue / totalAssets) * 100 : 0);

  return [
    { label: '总资产', value: formatCurrency(totalAssets) },
    { label: '浮动盈亏', value: formatSignedCurrency(floatingPnl) },
    { label: '当日盈亏', value: formatSignedCurrency(todayPnl) },
    { label: '总市值', value: formatCurrency(totalMarketValue) },
    { label: '可用', value: formatCurrency(availableCashValue) },
    { label: '可取', value: formatCurrency(withdrawableCashValue) },
    { label: '仓位', value: `${Math.max(usagePct, 0).toFixed(0)}%` },
  ];
});

function formatMoney(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

function formatCurrency(value: number) {
  return `¥${Math.round(value).toLocaleString()}`;
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function formatVolume(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed).toLocaleString() : '--';
}

function formatPercent(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '--';
  return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(2)}%`;
}

function normalizeList<T = Record<string, any>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: T[] }).items)) {
    return (data as { items?: T[] }).items as T[];
  }
  return [];
}


const openOrderStatuses = new Set(['SUBMITTING', 'NOTTRADED', 'PARTTRADED', 'PENDING', 'OPEN']);

function isOpenOrderStatus(value: unknown) {
  return openOrderStatuses.has(String(value || '').trim().toUpperCase());
}

function normalizeOpenOrder(item: any, index: number): OrderRow {
  return {
    id: String(item.id || item.order_id || index),
    time: item.time || item.created_at || '--',
    code: item.code || item.vt_symbol?.split('.')?.[0] || '000000',
    name: item.name || item.stock_name || '未知股票',
    side: item.side || item.direction || '买入',
    price: Number(item.price ?? item.limit_price ?? 0),
    qty: Number(item.qty ?? item.volume ?? 0),
    filled: Number(item.filled ?? item.traded ?? item.traded_volume ?? 0),
    status: item.status || '待撤',
  };
}

function parsePresetNotes(value: unknown): Record<string, any> {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function normalizePresetOrder(record: any, index: number) {
  const notes = parsePresetNotes(record.notes);
  const symbol = String(record.symbol || record.vt_symbol || record.vtSymbol || record.code || record.security || `PRESET-${index + 1}`);
  const accountId = String(record.account_id || record.accountId || record.account_no || record.account || '');
  return {
    id: String(record.id || record.preset_order_id || record.order_id || index),
    direction: String(record.direction || record.side || record.order_side || 'BUY').toUpperCase(),
    account_id: accountId || String(notes.account_id || notes.accountId || notes.account || ''),
    symbol,
    name: String(record.name || record.security_name || record.stock_name || notes.name || ''),
    price_strategy: String(record.price_strategy || record.priceStrategy || notes.price_strategy || 'LIMIT'),
    quantity: toFiniteNumber(record.quantity ?? record.volume ?? record.qty ?? 0),
    validity: String(record.validity || record.valid_until || record.valid_until_type || notes.validity || 'DAY'),
    effective_rule: String(record.effective_rule || record.effectiveRule || notes.effective_rule || 'IMMEDIATE'),
    agreed: Boolean(record.agreed ?? record.protocol_accepted ?? record.agreement_accepted ?? notes.agreed ?? true),
    status: String(record.status || record.state || '待生效'),
    created_at: String(record.created_at || record.createdAt || record.time || ''),
    notes: String(record.notes || ''),
  };
}

function maskAccountId(value: string) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '****';
  if (trimmed.length <= 4) return `****${trimmed}`;
  return `****${trimmed.slice(-4)}`;
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitVtSymbol(value: string | undefined) {
  const [code = '', exchange = 'SSE'] = (value || '').split('.');
  return {
    code: code || (value || ''),
    exchange: exchange || 'SSE',
  };
}

function clampShares(value: number, step: number) {
  if (value <= 0) return 0;
  return Math.floor(value / step) * step;
}

async function loadTemplates() {
  try {
    const data = await api.get('/strategies/templates');
    templates.value = Array.isArray(data) ? data : [];
  } catch {
    templates.value = [];
  }
}

async function loadPresetOrders() {
  try {
    const data = await api.get('/prefill-orders');
    presetOrders.value = normalizeList<any>(data).map(normalizePresetOrder);
  } catch {
    presetOrders.value = [];
  }
}

function loadOpenOrders() { loadWorkbenchData(); }

const syncingFutu = ref(false);
async function syncFutuOrders() {
  syncingFutu.value = true;
  try {
    const data = await api.get('/orders/futu/sync');
    toast(`Futu 同步完成: ${data.synced_orders} 订单, ${data.synced_deals} 成交`);
    await loadQueryOrders();
  } catch (e: any) { toast(e?.message || '同步失败'); }
  syncingFutu.value = false;
}

async function cancelOrder(orderId: string) {
  cancellingId.value = orderId;
  try {
    await api.delete(`/orders/${orderId}`);
    toast('委托已撤销');
    await loadWorkbenchData();
  } catch (e: any) {
    toast(e?.message || '撤单失败');
  }
  cancellingId.value = '';
}

function isModifiableStatus(status: string): boolean {
  const s = status.trim().toUpperCase();
  return s === 'NOTTRADED' || s === 'PARTTRADED';
}

function openModifyModal(order: any) {
  modifyForm.value = {
    orderId: order.id,
    price: order.price || 0,
    volume: order.qty || order.volume || 100,
  };
  showModifyModal.value = true;
}

function closeModifyModal() {
  showModifyModal.value = false;
}

async function submitModify() {
  try {
    const body: any = {};
    if (modifyForm.value.price > 0) body.price = modifyForm.value.price;
    if (modifyForm.value.volume > 0) body.volume = modifyForm.value.volume;
    await api.patch(`/orders/${modifyForm.value.orderId}`, body);
    toast('订单修改成功');
    closeModifyModal();
    await loadWorkbenchData();
  } catch (e: any) {
    toast(e?.message || '修改失败');
  }
}

async function loadWorkbenchData() {
  dashboardSnapshot.value = null;
  accountRows.value = [];

  try {
    const dash = await api.get('/dashboard');
    dashboardSnapshot.value = dash && typeof dash === 'object' ? dash : null;
    if (dash?.capital?.available != null) {
      availableCash.value = Number(dash.capital.available || 0);
    }
  } catch {
    // no-op
  }

  try {
    const data = await api.get('/accounts');
    const items = normalizeList<any>(data);
    accountRows.value = items.map((item: any, index: number) => {
      const balance = toFiniteNumber(item.balance ?? item.total_balance ?? 0);
      const frozen = toFiniteNumber(item.frozen ?? item.frozen_balance ?? 0);
      const available = toFiniteNumber(item.available ?? (balance - frozen));
      const broker = String(item.broker || item.broker_name || item.account_name || '交易账户');
      const accountId = String(item.account_id || item.account_no_masked || item.account_no || item.id || `acc-${index}`);
      return {
        id: String(item.id || index),
        broker,
        account_id: accountId,
        balance,
        frozen,
        available,
        is_simulated: Boolean(item.is_simulated ?? item.isSimulated ?? true),
        is_primary: Boolean(item.is_primary ?? false),
        is_active: item.is_active !== false,
      };
    });
    if (accountRows.value.length > 0) {
      // Select primary account, or first active account
      const primary = accountRows.value.find(a => a.is_primary && a.is_active)
                  || accountRows.value.find(a => a.is_active)
                  || accountRows.value[0];
      currentAccountId.value = primary.id;
      gatewayName.value = primary.broker;
    }
    if (availableCash.value <= 0) {
      availableCash.value = accountRows.value.reduce((sum, row) => sum + row.available, 0);
    }
  } catch {
    // no-op
  }

  try {
    const pos = await api.get('/positions');
    const items = normalizeList<any>(pos);
    positions.value = items.map((item: any, index: number) => {
      const vtSymbol = String(item.vt_symbol || item.vtSymbol || item.symbol || '');
      const parsed = splitVtSymbol(vtSymbol);
      const volume = toFiniteNumber(item.volume ?? item.position_volume ?? item.available_qty ?? item.base_volume ?? 0);
      const currentPriceValue = toFiniteNumber(item.current_price ?? item.last_price ?? 0);
      const marketValue = toFiniteNumber(item.market_value ?? item.current_value ?? (volume > 0 && currentPriceValue > 0 ? volume * currentPriceValue : 0));
      return {
        id: String(item.id || item.position_id || index),
        vt_symbol: vtSymbol,
        exchange: String(item.exchange || parsed.exchange || 'SSE'),
        code: String(item.code || parsed.code || item.symbol || `P${index + 1}`),
        name: String(item.name || item.stock_name || item.symbol_name || parsed.code || item.symbol || '未知股票'),
        volume,
        sellable: toFiniteNumber(item.sellable_qty ?? item.sellable ?? Math.max(volume - toFiniteNumber(item.frozen_qty ?? item.t1_locked_qty ?? 0), 0)),
        frozen: toFiniteNumber(item.t1_locked_qty ?? item.frozen_qty ?? 0),
        costPrice: toFiniteNumber(item.cost_price ?? item.entry_price ?? item.base_price ?? 0),
        currentPrice: currentPriceValue,
        pnl: toFiniteNumber(item.unrealized_pnl ?? item.pnl ?? item.profit_loss ?? 0),
        marketValue,
        weight: toFiniteNumber(item.weight ?? item.position_pct ?? item.usage_pct ?? 0),
        priceChangePct: toFiniteNumber(item.price_change_pct ?? item.change_pct ?? item.unrealized_pnl_pct ?? 0),
      };
    });
  } catch {
    positions.value = [];
  }

  try {
    // Backend has no dedicated open-orders endpoint. Keep web aligned with
    // mobile by listing /orders and filtering open statuses client-side.
    const orders = await api.get('/orders');
    openOrders.value = normalizeList<any>(orders)
      .filter((item: any) => isOpenOrderStatus(item.status))
      .map(normalizeOpenOrder);
  } catch {
    openOrders.value = [];
  }

  await loadPresetOrders();
}

function onSearchInput() {
  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    searchLoading.value = true;
    try {
      const data = await api.get(`/market/search?q=${encodeURIComponent(q)}`);
      searchResults.value = data.results || [];
      showDropdown.value = searchResults.value.length > 0;
    } catch {
      searchResults.value = [];
      showDropdown.value = false;
    }
    searchLoading.value = false;
  }, 250);
}

function onSearchBlur() {
  setTimeout(() => {
    showDropdown.value = false;
  }, 150);
}

function setBuyShares(value: number) {
  buySharesInput.value = String(Math.max(value, 0));
}

function setSellShares(value: number) {
  sellSharesInput.value = String(Math.max(value, 0));
}

function sanitizeSharesInput(kind: 'buy' | 'sell') {
  const ref = kind === 'buy' ? buySharesInput : sellSharesInput;
  ref.value = ref.value.replace(/[^0-9]/g, '');
}

function adjustBuyShares(delta: number) {
  setBuyShares(buyShares.value + delta);
}

function adjustSellShares(delta: number) {
  setSellShares(sellShares.value + delta);
}

function adjustBuyPrice(delta: number) {
  const next = Math.max(Number((buyPrice.value + delta).toFixed(2)), priceTick.value);
  buyPriceInput.value = String(next);
}

function setBuyPreset(preset: { quantity: number; valid: boolean }) {
  if (!preset.valid || preset.quantity <= 0) return;
  setBuyShares(preset.quantity);
}

function setSellPreset(preset: { quantity: number; valid: boolean }) {
  if (!preset.valid || preset.quantity <= 0) return;
  setSellShares(preset.quantity);
}

function refreshWorkbench() {
  loadTemplates();
  loadWorkbenchData();
  toast('工作台已刷新');
}

function openPresetOrders() {
  activeTab.value = 'query';
  activeQuerySection.value = 'prefill-orders';
  syncPresetFormFromWorkbench();
}

function syncPresetFormFromWorkbench() {
  presetForm.value.accountId ||= accountRows.value[0]?.id || '';
  presetForm.value.symbol ||= currentSymbol.value || selectedStock.value?.code || '';
  presetForm.value.priceStrategy ||= 'LIMIT';
  if (!presetForm.value.quantity) {
    presetForm.value.quantity = String(
      buyShares.value > 0
        ? buyShares.value
        : sellShares.value > 0
          ? sellShares.value
          : selectedStock.value
            ? (lotSize.value || 100)
            : 0,
    );
  }
}

function resetPresetForm() {
  presetForm.value = {
    direction: 'BUY',
    accountId: accountRows.value[0]?.id || '',
    symbol: selectedStock.value ? currentSymbol.value : '',
    priceStrategy: 'LIMIT',
    quantity: '',
    validity: 'DAY',
    effectiveRule: 'IMMEDIATE',
    agreed: false,
  };
}

function sanitizePresetQuantity() {
  presetForm.value.quantity = presetForm.value.quantity.replace(/[^0-9]/g, '');
}

function fillFormFromPreset(record: {
  direction: string;
  account_id: string;
  symbol: string;
  price_strategy: string;
  quantity: number;
  validity: string;
  effective_rule: string;
  agreed: boolean;
  notes?: string;
}) {
  const notes = parsePresetNotes(record.notes);
  presetForm.value = {
    direction: record.direction === 'SELL' ? 'SELL' : 'BUY',
    accountId: record.account_id || notes.account_id || accountRows.value[0]?.id || '',
    symbol: record.symbol || notes.symbol || '',
    priceStrategy: record.price_strategy || notes.price_strategy || 'LIMIT',
    quantity: String(record.quantity || ''),
    validity: record.validity || notes.validity || 'DAY',
    effectiveRule: record.effective_rule || notes.effective_rule || 'IMMEDIATE',
    agreed: Boolean(record.agreed ?? notes.agreed),
  };
  activeQuerySection.value = 'prefill-orders';
}

function presetOrderPayload() {
  const symbol = presetForm.value.symbol.trim();
  const [code = symbol, exchange = selectedStock.value?.exchange || 'SSE'] = symbol.includes('.') ? symbol.split('.') : [symbol, selectedStock.value?.exchange || 'SSE'];
  const notes = JSON.stringify({
    symbol,
    account_id: presetForm.value.accountId,
    name: selectedStock.value?.name || '',
    code,
    exchange,
    price_strategy: presetForm.value.priceStrategy,
    validity: presetForm.value.validity,
    effective_rule: presetForm.value.effectiveRule,
    agreed: presetForm.value.agreed,
    reference_price: currentPriceSafe.value || undefined,
  });
  return {
    direction: presetForm.value.direction,
    quantity: presetFormQuantity.value,
    notes,
    vt_symbol: `${code}.${exchange}`,
    order_type: presetForm.value.priceStrategy === 'MARKET' ? 'MARKET' : 'LIMIT',
    price: presetForm.value.priceStrategy === 'MARKET' ? undefined : currentPriceSafe.value || undefined,
  };
}

async function submitPresetOrder() {
  if (!canSubmitPresetOrder.value) return;
  presetSubmitting.value = true;
  try {
    const payload = presetOrderPayload();
    const params = new URLSearchParams();
    params.set('vt_symbol', payload.vt_symbol);
    params.set('direction', payload.direction === 'SELL' ? 'SHORT' : 'LONG');
    params.set('order_type', payload.order_type);
    params.set('volume', String(payload.quantity));
    if (payload.price != null) params.set('price', String(payload.price));
    params.set('notes', payload.notes);
    await api.post(`/prefill-orders?${params.toString()}`);
    toast('预设委托已保存');
    await loadPresetOrders();
  } catch (error: any) {
    toast(error?.message || '预设委托保存失败');
  }
  presetSubmitting.value = false;
}

async function deletePresetOrder(id: string) {
  try {
    await api.delete(`/prefill-orders/${id}`);
    toast('预设委托已删除');
    await loadPresetOrders();
  } catch (error: any) {
    toast(error?.message || '删除失败');
  }
}

async function submitPresetOrderNow(id: string) {
  try {
    await api.post(`/prefill-orders/${id}/submit`);
    toast('已立即提交预设委托');
    await loadPresetOrders();
  } catch (error: any) {
    toast(error?.message || '立即提交失败');
  }
}

function openSettings() {
  window.location.hash = '#/settings';
}

function selectStock(stock: StockResult) {
  selectedStock.value = stock;
  searchQuery.value = `${stock.code} ${stock.name}`;
  showDropdown.value = false;
  searchResults.value = [];
  selectedPositionId.value = '';
  if (activeQuerySection.value === 'prefill-orders') {
    presetForm.value.symbol = `${stock.code}.${stock.exchange}`;
  }
  loadSnapshot(stock);
}

async function loadSnapshot(stock: StockResult) {
  try {
    const data = await api.get(`/market/${stock.code}.${stock.exchange}/snapshot`);
    currentPrice.value = Number(data.last_price ?? data.close ?? 0);
    limitUp.value = Number(data.limit_up ?? 0);
    limitDown.value = Number(data.limit_down ?? 0);
    priceTick.value = Number(data.price_tick ?? 0.01);
    lotSize.value = Number(data.lot_size ?? 100);
    buyStep.value = Math.max(Number(data.buy_step ?? data.lot_size ?? 100), lotSize.value);
    sellStep.value = Math.max(Number(data.sell_step ?? data.lot_size ?? 100), lotSize.value);
    bidPrices.value = Array.isArray(data.bid_prices) ? data.bid_prices.slice(0, 5).map((v: unknown) => Number(v) || 0) : [];
    askPrices.value = Array.isArray(data.ask_prices) ? data.ask_prices.slice(0, 5).map((v: unknown) => Number(v) || 0) : [];
    bidVolumes.value = Array.isArray(data.bid_volumes) ? data.bid_volumes.slice(0, 5).map((v: unknown) => Number(v) || 0) : [];
    askVolumes.value = Array.isArray(data.ask_volumes) ? data.ask_volumes.slice(0, 5).map((v: unknown) => Number(v) || 0) : [];
    if (!buyPriceInput.value || buyPriceInput.value === '0') buyPriceInput.value = String(currentPrice.value || 0);
  } catch {
    currentPrice.value = 0;
  }

  try {
    const rules = await tradingRulesApi.snapshot(`${stock.code}.${stock.exchange}`);
    lotSize.value = Number(rules.context.lot_size || lotSize.value || 100);
    buyStep.value = Math.max(Number(rules.context.buy_step || lotSize.value), lotSize.value);
    sellStep.value = Math.max(Number(rules.context.sell_step || lotSize.value), lotSize.value);
    priceTick.value = Number(rules.context.price_tick || priceTick.value || 0.01);
  } catch {
    // keep snapshot fallback
  }
}

function syncSellFromPosition() {
  const position = positions.value.find(item => item.id === selectedPositionId.value);
  if (!position) return;
  const parsed = splitVtSymbol(position.vt_symbol);
  selectedStock.value = { code: position.code || parsed.code, name: position.name, exchange: position.exchange || parsed.exchange || 'SSE' };
  currentPrice.value = position.currentPrice;
  costPrice.value = position.costPrice;
  positionVolume.value = position.volume;
  positionPnl.value = position.pnl;
  sellableQty.value = position.sellable;
  t1LockedQty.value = position.frozen;
  sellSharesInput.value = String(position.sellable || sellableQty.value || 0);
  void loadSnapshot(selectedStock.value);
}

function loadPositionToBuy(position: PositionRow) {
  activeTab.value = 'buy';
  const parsed = splitVtSymbol(position.vt_symbol);
  selectedStock.value = { code: position.code || parsed.code, name: position.name, exchange: position.exchange || parsed.exchange || 'SSE' };
  currentPrice.value = position.currentPrice;
  buyPriceInput.value = String(position.currentPrice || 0);
  buySharesInput.value = String(position.volume || lotSize.value);
  void loadSnapshot(selectedStock.value);
}

function loadPositionToSell(position: PositionRow) {
  activeTab.value = 'sell';
  selectedPositionId.value = position.id;
  syncSellFromPosition();
}

function openPositionDetail(position: PositionRow, action: 'bind' | 'unbind' | 'pause' | 'stop-loss' | 'clear') {
  const params = new URLSearchParams({ action });
  window.location.hash = `#/positions/${position.id}?${params.toString()}`;
}

function applyWorkbenchIntent() {
  const symbolParam = Array.isArray(route.query.symbol) ? route.query.symbol[0] : route.query.symbol;
  const sideParam = Array.isArray(route.query.side) ? route.query.side[0] : route.query.side;
  if (!symbolParam) return;

  const symbol = String(symbolParam).trim();
  const parsed = splitVtSymbol(symbol);
  const side = sideParam === 'sell' ? 'sell' : 'buy';
  const matchedPosition = positions.value.find((position) => {
    const positionParsed = splitVtSymbol(position.vt_symbol);
    return position.vt_symbol === symbol || position.code === parsed.code || positionParsed.code === parsed.code;
  });

  activeTab.value = side;
  if (matchedPosition) {
    if (side === 'sell') loadPositionToSell(matchedPosition);
    else loadPositionToBuy(matchedPosition);
    return;
  }

  selectedPositionId.value = '';
  selectedStock.value = { code: parsed.code || symbol, name: parsed.code || symbol, exchange: parsed.exchange || 'SSE' };
  searchQuery.value = symbol;
  void loadSnapshot(selectedStock.value);
}

async function submitBuy() {
  if (!canSubmitBuy.value) return;
  submitting.value = true;
  try {
    const payload = {
      vt_symbol: `${selectedStock.value!.code}.${selectedStock.value!.exchange}`,
      direction: 'LONG',
      order_type: buyPrice.value > 0 ? 'LIMIT' : 'MARKET',
      volume: buyShares.value,
      price: buyPrice.value > 0 ? buyPrice.value : undefined,
      gateway_name: gatewayName.value,
      strategy_template_id: strategyBindingEnabled.value ? selectedTemplateId.value || null : null,
    };
    await api.post('/orders', payload);
    toast('买入订单已提交');
    buySharesInput.value = '';
  } catch (error: any) {
    toast(error?.message || '买入失败');
  }
  submitting.value = false;
}

async function submitSell() {
  if (!canSubmitSell.value) return;
  submitting.value = true;
  try {
    await api.post('/orders', {
      vt_symbol: `${selectedStock.value?.code || ''}.${selectedStock.value?.exchange || 'SSE'}`,
      direction: 'SHORT',
      order_type: 'LIMIT',
      volume: sellShares.value,
      price: currentPrice.value,
    });
    toast('卖出订单已提交');
    sellSharesInput.value = '';
  } catch (error: any) {
    toast(error?.message || '卖出失败');
  }
  submitting.value = false;
}

// ── 多账号下单 computed & methods ──────────────────────────────────

const multiVolumeNumber = computed(() => Math.max(0, parseInt((allocatorName.value === 'follow_main' ? multiPerAccountVolume.value : multiTotalVolume.value) || '0', 10) || 0));

const multiVolumeInput = computed({
  get: () => allocatorName.value === 'follow_main' ? multiPerAccountVolume.value : multiTotalVolume.value,
  set: (val: string) => {
    if (allocatorName.value === 'follow_main') multiPerAccountVolume.value = val;
    else multiTotalVolume.value = val;
  },
});

const canSubmitMulti = computed(() =>
  !!selectedStock.value
  && selectedAccountIds.value.length >= 2
  && selectedAccountIds.value.every(id => accountRows.value.find(a => a.account_id === id)?.is_active)
  && multiVolumeNumber.value >= 100
);

const multiPreview = computed(() => {
  if (!selectedStock.value || selectedAccountIds.value.length < 2 || multiVolumeNumber.value <= 0) return [];
  const selected = accountRows.value.filter(a => selectedAccountIds.value.includes(a.account_id) && a.is_active);
  const price = buyPrice.value || currentPrice.value || 0;
  if (allocatorName.value === 'follow_main') {
    return selected.map(a => ({ account_id: a.account_id, broker: a.broker, volume: multiVolumeNumber.value, amount: multiVolumeNumber.value * price }));
  }
  if (allocatorName.value === 'manual') {
    return selected.map(a => {
      const v = multiManualVolumes.value[a.account_id] || 0;
      return { account_id: a.account_id, broker: a.broker, volume: v, amount: v * price };
    });
  }
  // For even/weighted/by_funds the backend does allocation — show estimate
  const perAccount = Math.round((multiVolumeNumber.value / selected.length) / 100) * 100;
  return selected.map(a => ({ account_id: a.account_id, broker: a.broker, volume: perAccount, amount: perAccount * price }));
});

function sanitizeMultiVolume() {
  const ref = allocatorName.value === 'follow_main' ? multiPerAccountVolume : multiTotalVolume;
  ref.value = ref.value.replace(/[^0-9]/g, '');
}

function sanitizeManualVolume(accountId: string) {
  const v = multiManualVolumes.value[accountId];
  if (typeof v === 'number') return;
  multiManualVolumes.value[accountId] = parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
}

async function submitMultiAccount() {
  if (!canSubmitMulti.value || !selectedStock.value) return;
  multiSubmitting.value = true;
  multiResult.value = null;
  try {
    const stock = selectedStock.value;
    const vtSymbol = `${stock.code}.${stock.exchange}`;
    const body: any = {
      vt_symbol: vtSymbol,
      direction: 'LONG',
      order_type: buyPrice.value > 0 ? 'LIMIT' : 'MARKET',
      allocator: allocatorName.value,
      account_ids: selectedAccountIds.value,
    };
    if (buyPrice.value > 0) body.price = buyPrice.value;
    if (allocatorName.value === 'follow_main') {
      body.per_account_volume = multiVolumeNumber.value;
    } else if (allocatorName.value === 'manual') {
      body.manual_map = { ...multiManualVolumes.value };
    } else {
      body.total_volume = multiVolumeNumber.value;
    }
    const data = await api.post('/orders/multi-account', body);
    multiResult.value = data;
    toast('多账号订单已提交');
  } catch (error: any) {
    toast(error?.message || '多账号下单失败');
  }
  multiSubmitting.value = false;
}


onMounted(() => {
  void (async () => {
    await Promise.all([loadTemplates(), loadWorkbenchData()]);
    applyWorkbenchIntent();
    if (!presetForm.value.accountId && accountRows.value[0]?.id) {
      presetForm.value.accountId = accountRows.value[0].id;
    }
  })();
  buyPriceInput.value = '0';
});

watch(
  () => selectedPositionId.value,
  () => {
    if (activeTab.value === 'sell' && selectedPositionId.value) {
      syncSellFromPosition();
    }
  },
);
</script>

<style scoped>
.trading-workbench {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workbench-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workbench-header__eyebrow,
.card-head,
.switch-row,
.action-footer,
.query-section__head,
.workbench-header__context,
.context-actions,
.quick-actions,
.position-card,
.security-banner,
.quote-grid,
.summary-grid,
.table-head,
.table-row,
.template-row {
  display: flex;
  align-items: center;
}

.workbench-header__eyebrow,
.card-head,
.switch-row,
.action-footer,
.query-section__head,
.security-banner,
.table-head,
.table-row {
  justify-content: space-between;
}

.workbench-header__title h2,
.card-head h3 {
  margin: 0;
}

.workbench-header__context {
  gap: 0.75rem;
  flex-wrap: wrap;
}

.context-chip {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 160px;
  padding: 0.75rem 1rem;
  background: var(--tr-bg);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
}

.context-chip--search {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.context-actions {
  gap: 0.5rem;
}

.workbench-note,
.tab-card,
.action-card,
.side-card {
  padding: 1rem;
}

.tab-bar {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

.tab-btn {
  border: 1px solid var(--tr-border);
  background: var(--tr-bg);
  color: var(--tr-muted);
  border-radius: var(--tr-radius-sm);
  padding: 0.75rem 0.5rem;
  font-weight: 600;
}

.tab-btn.active {
  background: rgba(30, 173, 111, 0.12);
  color: var(--tr-brand);
  border-color: rgba(30, 173, 111, 0.25);
}

.workbench-layout {
  display: grid;
  grid-template-columns: 1.6fr 0.9fr;
  gap: 1rem;
}

.workbench-main,
.workbench-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.security-banner {
  background: var(--tr-bg);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  padding: 0.9rem 1rem;
  margin: 0.25rem 0 1rem;
}

.quote-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.step-input {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.step-input__field {
  text-align: center;
}

.step-btn {
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--tr-border);
  border-radius: 999px;
  background: var(--tr-bg);
  color: var(--tr-text);
}

.helper-text {
  margin-top: 0.35rem;
  font-size: 0.8rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.summary-item,
.query-section {
  background: var(--tr-bg);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  padding: 0.85rem 1rem;
}

.summary-item strong,
.query-section strong {
  display: block;
  margin-top: 0.25rem;
}

.warning-box,
.empty-state {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--tr-radius-sm);
  background: rgba(245, 158, 11, 0.08);
}

.empty-state {
  border-style: dashed;
  background: rgba(21, 25, 34, 0.7);
}

.empty-state.compact {
  margin-top: 0.5rem;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.5rem;
  align-items: center;
}

.table-head {
  padding-bottom: 0.5rem;
  color: var(--tr-muted);
  font-size: 0.8rem;
}

.table-row {
  background: var(--tr-bg);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  padding: 0.75rem 0.8rem;
  font-size: 0.9rem;
}

.asset-grid,
.query-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.position-list,
.template-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-orders-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preset-orders-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.preset-order-layout {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1rem;
}

.preset-order-form,
.preset-order-records {
  padding: 1rem;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-panel);
}

.preset-order-form .card-head,
.preset-order-records .card-head {
  margin-bottom: 0.75rem;
}

.agreement-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  color: var(--tr-text);
}

.preset-record-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-record-card {
  padding: 0.9rem 1rem;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
}

.preset-record-card__head,
.preset-record-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.preset-record-card__foot {
  margin-top: 0.75rem;
}

.preset-record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 0.75rem;
  margin-top: 0.75rem;
}

.preset-record-grid strong {
  display: block;
  margin-top: 0.2rem;
}

.position-card {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
}

.position-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: var(--tr-muted);
  font-size: 0.85rem;
}

.template-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.75rem 0.85rem;
  background: var(--tr-bg);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
}

.query-grid {
  margin-bottom: 1rem;
}

.quote-grid {
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.quote-grid > div {
  min-width: 140px;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-panel);
  z-index: 20;
  overflow: hidden;
}

.search-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0.9rem;
  background: transparent;
  border: 0;
  color: var(--tr-text);
}

.search-item:hover {
  background: var(--tr-bg);
}

.search-item__main {
  text-align: left;
}

.action-footer {
  margin-top: 1rem;
  gap: 0.75rem;
  align-items: center;
}

@media (max-width: 1024px) {
  .workbench-layout {
    grid-template-columns: 1fr;
  }

  .preset-order-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .tab-bar,
  .summary-grid,
  .asset-grid,
  .query-grid {
    grid-template-columns: 1fr;
  }

  .table-head,
  .table-row {
    grid-template-columns: 1fr;
  }

  .action-footer,
  .context-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: var(--tr-panel, #1a1d28);
  border: 1px solid var(--tr-border, #2d3148);
  border-radius: var(--tr-radius, 8px);
  padding: 1.5rem;
  min-width: 360px;
  max-width: 480px;
}

.modal-content h3 {
  margin: 0 0 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--tr-muted, #8b90a0);
  font-size: 0.85rem;
}

.form-group input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--tr-border, #2d3148);
  border-radius: var(--tr-radius-sm, 4px);
  background: var(--tr-bg, #11141e);
  color: var(--tr-text, #e0e2ec);
  font-size: 0.95rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
</style>
