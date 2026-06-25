<template>
  <div>
    <!-- ═══════════════════════════════════════════ -->
    <!-- TradeLot Batch View (/tradelot)            -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-if="isTradeLotView">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tr-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <span style="font-size:1.25rem;font-weight:700;color:var(--tr-text)">持仓与执行批次 (TradeLot)</span>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button
            v-for="f in lotFilters"
            :key="f.key"
            class="btn btn-sm"
            :class="lotFilter === f.key ? 'btn-primary' : 'btn-outline'"
            @click="lotFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- Desktop Column Headers -->
      <div class="desktop-only" style="display:flex;padding:0.5rem 1rem;font-size:0.75rem;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--tr-border);margin-bottom:0.5rem">
        <span style="flex:2">标的·现价</span>
        <span style="flex:1;text-align:right">持仓市值</span>
        <span style="flex:1;text-align:right">浮动盈亏</span>
        <span style="flex:1.5;text-align:right">策略状态·容量</span>
        <span style="flex:0.5;text-align:right">操作</span>
      </div>

      <!-- Loading -->
      <div v-if="tlLoading" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted)">Loading positions...</div>

      <!-- Error -->
      <div v-else-if="tlError" class="card" style="text-align:center;padding:2rem">
        <div style="color:var(--tr-up);margin-bottom:0.75rem">{{ tlError }}</div>
        <button class="btn btn-primary" @click="loadTradeLotPositions">Retry</button>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredTlPositions.length === 0" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted)">
        {{ lotFilter === 'all' ? 'No positions' : 'No matching positions' }}
      </div>

      <!-- Position Cards -->
      <div v-else>
        <div
          v-for="p in filteredTlPositions"
          :key="p.id"
          class="card tl-position-card"
          :class="{ 'tl-expanded': tlExpandedIds.has(p.id) }"
        >
          <!-- Collapsed Row -->
          <div
            class="tl-row-header"
            @click="toggleTradeLotExpand(p.id)"
          >
            <div style="flex:2">
              <div style="font-weight:600;color:var(--tr-text)">{{ p.stock_name || p.vt_symbol }}</div>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.125rem">
                <span style="font-size:0.8125rem;color:var(--tr-muted)">{{ p.vt_symbol }}</span>
                <span class="badge badge-muted" style="font-size:0.6875rem">{{ p.vt_symbol?.split('.')[1] || '--' }}</span>
                <span v-if="p.current_price" style="font-size:0.8125rem;color:var(--tr-text)">&yen;{{ formatNum(p.current_price) }}</span>
                <span v-if="p.price_change_pct != null" :class="p.price_change_pct >= 0 ? 'text-down' : 'text-up'" style="font-size:0.75rem">
                  {{ p.price_change_pct >= 0 ? '+' : '' }}{{ formatNum(p.price_change_pct) }}%
                </span>
              </div>
            </div>
            <div style="flex:1;text-align:right;font-weight:600">&yen;{{ (p.current_value || 0).toLocaleString() }}</div>
            <div style="flex:1;text-align:right" :class="(p.unrealized_pnl || 0) >= 0 ? 'text-down' : 'text-up'">
              <div style="font-weight:600">{{ (p.unrealized_pnl || 0) >= 0 ? '+' : '' }}&yen;{{ Math.abs(p.unrealized_pnl || 0).toLocaleString() }}</div>
              <div v-if="p.unrealized_pnl_pct != null" style="font-size:0.75rem">{{ (p.unrealized_pnl_pct || 0) >= 0 ? '+' : '' }}{{ formatNum(p.unrealized_pnl_pct) }}%</div>
            </div>
            <div style="flex:1.5;text-align:right">
              <span class="badge" style="background:rgba(30,173,111,0.1);color:var(--tr-brand);border:1px solid rgba(30,173,111,0.2)">
                {{ p.strategy_name || p.status || 'ACTIVE' }}
              </span>
              <!-- Capacity Bar -->
              <div class="progress-bar" style="margin-top:0.375rem">
                <div class="progress-bar-fill" :style="{ width: capacityPctTradeLot(p) + '%' }"></div>
              </div>
              <div style="font-size:0.6875rem;color:var(--tr-muted);margin-top:0.125rem">
                {{ p.add_count || 0 }}/{{ p.max_add_count || 5 }}
              </div>
            </div>
            <div style="flex:0.5;text-align:right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tr-muted)" stroke-width="2" style="transition:transform 0.2s" :style="tlExpandedIds.has(p.id) ? 'transform:rotate(180deg)' : ''">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          <!-- Expanded TradeLots Section -->
          <div v-if="tlExpandedIds.has(p.id)" class="tl-lots-section">
            <!-- Section Header -->
            <div class="tl-lots-header">
              <span style="font-weight:600;font-size:0.875rem;color:var(--tr-text)">执行批次明细 (TradeLots)</span>
              <div style="display:flex;gap:0.375rem">
                <button class="btn btn-sm btn-outline" @click.stop="openTuneParams(p)">参数调优</button>
                <button class="btn btn-sm btn-outline" @click.stop="pauseStrategy(p)">暂停策略</button>
                <button class="btn btn-sm btn-danger" @click.stop="clearStock(p)">一键清仓</button>
              </div>
            </div>

            <!-- TradeLots Content -->
            <div v-if="tlLotsLoading[p.id]" style="text-align:center;padding:1rem;color:var(--tr-muted)">Loading lots...</div>
            <div v-else-if="!tlLots[p.id]?.length" style="text-align:center;padding:1rem;color:var(--tr-muted)">No trade lots</div>
            <template v-else>
              <div v-for="(lot, i) in tlLots[p.id]" :key="lot.id || i">
                <!-- Base lot -->
                <div v-if="i === 0" class="tl-lot-row tl-base-lot">
                  <div style="display:flex;align-items:center;gap:0.5rem">
                    <span class="badge badge-muted" style="font-weight:600">底仓</span>
                    <span style="color:var(--tr-text)">&yen;{{ (lot.entry_amount || (lot.entry_price || 0) * (lot.entry_volume || 0)).toLocaleString() }}</span>
                    <span style="font-size:0.8125rem;color:var(--tr-muted)">成本 &yen;{{ formatNum(lot.entry_price) }}</span>
                    <span v-if="lot.locked" class="tl-lock-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      T+1 冻结
                    </span>
                  </div>
                  <div style="display:flex;align-items:center;gap:1rem">
                    <span v-if="lot.pnl != null" :class="lot.pnl >= 0 ? 'text-down' : 'text-up'" style="font-size:0.8125rem">
                      P&amp;L: {{ lot.pnl >= 0 ? '+' : '' }}&yen;{{ Math.abs(lot.pnl).toLocaleString() }}
                    </span>
                    <span v-if="lot.hard_stop_price" style="font-size:0.75rem;color:var(--tr-up)">硬止损 &yen;{{ formatNum(lot.hard_stop_price) }}</span>
                  </div>
                </div>

                <!-- Add lots -->
                <div v-else class="tl-lot-row" :class="{ 'tl-lot-pending': lot.status === 'PENDING' }">
                  <div style="display:flex;align-items:center;gap:0.5rem">
                    <span class="tl-lot-number" :class="lot.sellable !== false ? 'tl-lot-green' : 'tl-lot-muted'">#{{ i }}</span>
                    <span style="color:var(--tr-text)">&yen;{{ (lot.entry_amount || (lot.entry_price || 0) * (lot.entry_volume || 0)).toLocaleString() }}</span>
                    <span style="font-size:0.8125rem;color:var(--tr-muted)">成本 &yen;{{ formatNum(lot.entry_price) }}</span>
                    <span v-if="lot.locked" class="tl-lock-badge" style="font-size:0.6875rem">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </span>
                    <span v-else style="font-size:0.6875rem;color:var(--tr-down)">&#9679; 可卖出</span>
                  </div>
                  <!-- Sell Trigger Progress -->
                  <div v-if="lot.sell_trigger_price" style="margin-top:0.375rem">
                    <div style="display:flex;justify-content:space-between;font-size:0.6875rem;color:var(--tr-muted);margin-bottom:0.125rem">
                      <span>卖出触发 &yen;{{ formatNum(lot.sell_trigger_price) }}</span>
                      <span>{{ sellTriggerProgress(p, lot) }}%</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-bar-fill" :class="sellTriggerProgress(p, lot) >= 100 ? '' : 'warning'" :style="{ width: Math.min(sellTriggerProgress(p, lot), 100) + '%' }"></div>
                    </div>
                  </div>
                  <div style="margin-top:0.25rem">
                    <span class="badge" :class="lotStatusBadge(lot.status)">{{ lot.status || 'HOLDING' }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Multi-Execution Selector (inline) -->
            <div v-if="enableMultiExecution" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--tr-border)">
              <ExecutionSelector
                :executions="stockExecutionsForTradeLot[p.id] || []"
                :selectedId="selectedTlExecIds[p.id] || null"
                :loading="tlExecLoading[p.id] || false"
                :error="tlExecError[p.id] || ''"
                @select="(eid: string) => selectTradeLotExec(p.id, eid)"
                @add="openAddExecForTradeLot(p)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- TradeLot Tune Params Modal -->
      <div v-if="tlTuneModal.show" class="modal-overlay" @click.self="tlTuneModal.show = false">
        <div class="modal-content">
          <div class="modal-header">参数调优 — {{ tlTuneModal.stock?.stock_name || tlTuneModal.stock?.vt_symbol }}</div>
          <div v-if="tlTuneModal.loading" style="text-align:center;padding:1rem;color:var(--tr-muted)">Loading params...</div>
          <template v-else>
            <div class="input-group">
              <label>Base Amount (&yen;)</label>
              <input class="input-field" v-model.number="tlTuneForm.base_position_amount" type="number" step="10000" />
            </div>
            <div class="input-group">
              <label>Add Amount (&yen;)</label>
              <input class="input-field" v-model.number="tlTuneForm.add_position_amount" type="number" step="10000" />
            </div>
            <div class="input-group">
              <label>Add Trigger (%)</label>
              <input class="input-field" v-model.number="tlTuneForm.add_trigger_pct" type="number" step="0.1" />
            </div>
            <div class="input-group">
              <label>Sell Trigger (%)</label>
              <input class="input-field" v-model.number="tlTuneForm.sell_trigger_pct" type="number" step="0.1" />
            </div>
            <div class="input-group">
              <label>Max Add Count</label>
              <input class="input-field" v-model.number="tlTuneForm.max_add_count" type="number" min="1" max="20" />
            </div>
            <div class="input-group">
              <label>Hard Stop Loss (%)</label>
              <input class="input-field" v-model.number="tlTuneForm.hard_stop_loss_pct" type="number" step="0.1" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-outline" @click="tlTuneModal.show = false">Cancel</button>
              <button class="btn btn-primary" :disabled="tlTuneModal.saving" @click="saveTuneParams">
                {{ tlTuneModal.saving ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Add Execution Modal (TradeLot view) -->
      <div v-if="tlAddExecModal.show" class="modal-overlay" @click.self="tlAddExecModal.show = false">
        <div class="modal-content">
          <div class="modal-header">添加策略执行</div>
          <div style="font-size:0.8125rem;color:var(--tr-muted);margin-bottom:0.75rem">
            Stock: {{ tlAddExecModal.stock?.stock_name || tlAddExecModal.stock?.vt_symbol }}
          </div>
          <div class="input-group">
            <label>Strategy Template</label>
            <select class="input-field" v-model="tlAddExecForm.templateId">
              <option value="">Select template...</option>
              <option v-for="t in tlAddExecModal.templates" :key="t.id" :value="t.id">
                {{ t.name }}{{ t.is_system ? ' (System)' : '' }}
              </option>
            </select>
          </div>
          <div class="input-group">
            <label>Execution Name (optional)</label>
            <input class="input-field" v-model="tlAddExecForm.name" type="text" placeholder="e.g. Tail Grid #2" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="tlAddExecModal.show = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!tlAddExecForm.templateId || tlAddExecModal.saving" @click="addExecForTradeLot">
              {{ tlAddExecModal.saving ? 'Adding...' : 'Add Execution' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════ -->
    <!-- Single Position Detail (/positions/:id)   -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-else>
      <!-- Loading -->
      <div v-if="loading" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted)">
        Loading position...
      </div>

      <!-- Error -->
      <div v-else-if="error" class="card" style="text-align:center;padding:2rem">
        <div style="color:var(--tr-up);margin-bottom:0.75rem">{{ error }}</div>
        <button class="btn btn-primary" @click="$router.back()">Go Back</button>
      </div>

      <template v-else-if="position">
        <!-- Position Header -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:1.25rem;font-weight:700;color:var(--tr-text)">
                {{ position.vt_symbol }}
              </div>
              <span class="badge" :class="position.status?.toLowerCase() === 'active' ? 'badge-active' : 'badge-cleared'" style="margin-top:0.25rem">
                {{ position.status }}
              </span>
            </div>
            <div style="text-align:right">
              <div class="text-xl">&yen;{{ (position.current_value || 0).toLocaleString() }}</div>
              <div :class="(position.unrealized_pnl || 0) >= 0 ? 'text-down' : 'text-up'">
                P&amp;L: &yen;{{ (position.unrealized_pnl || 0).toLocaleString() }}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:1rem;margin-top:0.75rem;font-size:0.8125rem;color:var(--tr-muted)">
            <span>Initial: &yen;{{ formatNum(position.initial_price) }}</span>
            <span>Current: &yen;{{ formatNum(position.current_price) }}</span>
            <span>Last Entry: &yen;{{ formatNum(position.last_entry_price) }}</span>
          </div>
        </div>

        <!-- Multi-Execution Selector -->
        <div v-if="enableMultiExecution" class="card">
          <div style="font-weight:600;margin-bottom:0.75rem;color:var(--tr-text)">策略执行</div>
          <ExecutionSelector
            :executions="allExecutions"
            :selectedId="selectedExecutionId"
            :loading="execSelectorLoading"
            :error="execSelectorError"
            @select="selectExecution"
            @add="openAddExecInDetail"
          />
        </div>

        <!-- Strategy Parameters -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <span style="font-weight:600;color:var(--tr-text)">{{ enableMultiExecution ? 'Execution Parameters' : 'Strategy Parameters' }}</span>
            <button v-if="!editingParams" class="btn btn-sm btn-outline" @click="startEditParams">Edit</button>
          </div>

          <!-- View Mode -->
          <div v-if="!editingParams">
            <div class="param-group">
              <div class="param-group-label">Entry</div>
              <div class="grid-2">
                <div class="param-item">
                  <span class="text-secondary">Base Amount</span>
                  <span style="color:var(--tr-text)">&yen;{{ currentParams.base_position_amount?.toLocaleString() || '--' }}</span>
                </div>
                <div class="param-item">
                  <span class="text-secondary">Add Amount</span>
                  <span style="color:var(--tr-text)">&yen;{{ currentParams.add_position_amount?.toLocaleString() || '--' }}</span>
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Position</div>
              <div class="grid-2">
                <div class="param-item">
                  <span class="text-secondary">Max Add Count</span>
                  <span style="color:var(--tr-text)">{{ currentParams.max_add_count ?? '--' }}</span>
                </div>
                <div class="param-item">
                  <span class="text-secondary">Max Position Amount</span>
                  <span style="color:var(--tr-text)">&yen;{{ currentParams.max_position_amount?.toLocaleString() || '--' }}</span>
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Exit</div>
              <div class="grid-2">
                <div class="param-item">
                  <span class="text-secondary">Add Trigger</span>
                  <span class="text-down">{{ currentParams.add_trigger_pct ?? '--' }}%</span>
                </div>
                <div class="param-item">
                  <span class="text-secondary">Sell Trigger</span>
                  <span class="text-up">{{ currentParams.sell_trigger_pct ?? '--' }}%</span>
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Risk</div>
              <div class="grid-2">
                <div class="param-item">
                  <span class="text-secondary">Hard Stop Loss</span>
                  <span class="text-up">{{ currentParams.hard_stop_loss_pct ?? '--' }}%</span>
                </div>
                <div class="param-item">
                  <span class="text-secondary">Price Type</span>
                  <span style="color:var(--tr-text)">{{ currentParams.add_price_type || 'market' }} / {{ currentParams.sell_price_type || 'market' }}</span>
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Flags</div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                <span class="badge" :class="currentParams.enable_auto_add ? 'badge-active' : 'badge-stopped'">
                  Auto Add: {{ currentParams.enable_auto_add ? 'ON' : 'OFF' }}
                </span>
                <span class="badge" :class="currentParams.enable_auto_sell ? 'badge-active' : 'badge-stopped'">
                  Auto Sell: {{ currentParams.enable_auto_sell ? 'ON' : 'OFF' }}
                </span>
                <span class="badge" :class="currentParams.enable_hard_stop ? 'badge-active' : 'badge-stopped'">
                  Hard Stop: {{ currentParams.enable_hard_stop ? 'ON' : 'OFF' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else>
            <div class="param-group">
              <div class="param-group-label">Entry</div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Base Amount (&yen;)</label>
                  <input class="input-field" v-model.number="editForm.base_position_amount" type="number" step="10000" />
                </div>
                <div class="input-group" style="flex:1">
                  <label>Add Amount (&yen;)</label>
                  <input class="input-field" v-model.number="editForm.add_position_amount" type="number" step="10000" />
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Position</div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Max Add Count</label>
                  <input class="input-field" v-model.number="editForm.max_add_count" type="number" min="1" max="20" />
                </div>
                <div class="input-group" style="flex:1">
                  <label>Max Position Amount (&yen;)</label>
                  <input class="input-field" v-model.number="editForm.max_position_amount" type="number" step="10000" />
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Exit</div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Add Trigger (%)</label>
                  <input class="input-field" v-model.number="editForm.add_trigger_pct" type="number" step="0.1" />
                </div>
                <div class="input-group" style="flex:1">
                  <label>Sell Trigger (%)</label>
                  <input class="input-field" v-model.number="editForm.sell_trigger_pct" type="number" step="0.1" />
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Risk</div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Hard Stop Loss (%)</label>
                  <input class="input-field" v-model.number="editForm.hard_stop_loss_pct" type="number" step="0.1" />
                </div>
              </div>
            </div>
            <div class="param-group">
              <div class="param-group-label">Flags</div>
              <div style="display:flex;flex-direction:column;gap:0.5rem">
                <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;color:var(--tr-text)">
                  Auto Add <span class="toggle" :class="{ active: editForm.enable_auto_add }" @click="editForm.enable_auto_add = !editForm.enable_auto_add"></span>
                </label>
                <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;color:var(--tr-text)">
                  Auto Sell <span class="toggle" :class="{ active: editForm.enable_auto_sell }" @click="editForm.enable_auto_sell = !editForm.enable_auto_sell"></span>
                </label>
                <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;color:var(--tr-text)">
                  Hard Stop <span class="toggle" :class="{ active: editForm.enable_hard_stop }" @click="editForm.enable_hard_stop = !editForm.enable_hard_stop"></span>
                </label>
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:1rem">
              <button class="btn btn-primary" :disabled="savingParams" @click="saveParams">
                {{ savingParams ? 'Saving...' : 'Save Parameters' }}
              </button>
              <button class="btn btn-outline" @click="cancelEditParams">Cancel</button>
            </div>
          </div>
        </div>

        <!-- TradeLots -->
        <div class="card">
          <div style="font-weight:600;margin-bottom:0.75rem;color:var(--tr-text)">Trade Lots</div>
          <div v-if="lotsLoading" style="text-align:center;padding:1rem;color:var(--tr-muted)">Loading lots...</div>
          <div v-else-if="tradeLots.length === 0" style="text-align:center;padding:1rem;color:var(--tr-muted)">
            No trade lots
          </div>
          <div v-else>
            <div style="display:flex;gap:0.25rem;margin-bottom:0.5rem;flex-wrap:wrap">
              <button
                v-for="col in sortableColumns"
                :key="col.key"
                class="btn btn-sm"
                :class="sortKey === col.key ? 'btn-primary' : 'btn-outline'"
                @click="toggleSort(col.key)"
              >
                {{ col.label }} {{ sortKey === col.key ? (sortAsc ? '▲' : '▼') : '' }}
              </button>
            </div>
            <div class="lot-row" v-for="lot in sortedLots" :key="lot.id">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <span style="font-weight:500;color:var(--tr-text)">#{{ lot.batch_index }}</span>
                  <span class="badge" :class="lotStatusBadge(lot.status)" style="margin-left:0.375rem">
                    {{ lot.status }}
                  </span>
                  <span v-if="lot.locked" class="badge badge-stopped" style="margin-left:0.25rem">Locked</span>
                </div>
                <div style="text-align:right">
                  <div style="color:var(--tr-text)">&yen;{{ formatNum(lot.entry_price) }}</div>
                  <div class="text-secondary">{{ lot.entry_volume || 0 }} sh</div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:0.25rem;font-size:0.75rem">
                <span class="text-secondary">Entry: {{ formatDate(lot.entry_time) }}</span>
                <span v-if="lot.exit_price" class="text-secondary">Exit: &yen;{{ formatNum(lot.exit_price) }}</span>
                <span v-if="lot.pnl != null" :class="lot.pnl >= 0 ? 'text-down' : 'text-up'">
                  P&amp;L: &yen;{{ lot.pnl.toLocaleString() }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- P&L Summary -->
        <div v-if="tradeLots.length > 0" class="card">
          <div style="font-weight:600;margin-bottom:0.75rem;color:var(--tr-text)">P&amp;L Summary</div>
          <div class="grid-2">
            <div style="text-align:center">
              <div class="text-lg" :class="pnlSummary.total >= 0 ? 'text-down' : 'text-up'">
                &yen;{{ pnlSummary.total.toLocaleString() }}
              </div>
              <div class="text-secondary">Total P&amp;L</div>
            </div>
            <div style="text-align:center">
              <div class="text-lg" style="color:var(--tr-text)">{{ pnlSummary.soldCount }} / {{ pnlSummary.totalCount }}</div>
              <div class="text-secondary">Sold / Total Lots</div>
            </div>
          </div>
        </div>

        <!-- Per-Execution Performance -->
        <div v-if="enableMultiExecution && execPerformance" class="card">
          <div style="font-weight:600;margin-bottom:0.75rem;color:var(--tr-text)">Execution Performance</div>
          <div v-if="execPerfLoading" style="text-align:center;padding:0.75rem;color:var(--tr-muted)">Loading performance...</div>
          <div v-else-if="execPerfError" style="text-align:center;padding:0.5rem;color:var(--tr-up);font-size:0.8125rem">{{ execPerfError }}</div>
          <div v-else>
            <div class="grid-3" style="margin-bottom:0.75rem">
              <div style="text-align:center">
                <div style="font-size:1.125rem;font-weight:700;color:var(--tr-text)">&yen;{{ (execPerformance.total_invested || 0).toLocaleString() }}</div>
                <div class="text-secondary">Invested</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.125rem;font-weight:700;color:var(--tr-text)">&yen;{{ (execPerformance.current_value || 0).toLocaleString() }}</div>
                <div class="text-secondary">Current Value</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.125rem;font-weight:700" :class="execPerformance.total_pnl >= 0 ? 'text-down' : 'text-up'">
                  &yen;{{ (execPerformance.total_pnl || 0).toLocaleString() }}
                </div>
                <div class="text-secondary">Total P&amp;L</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8125rem;color:var(--tr-muted)">
              <span>Trades: {{ execPerformance.trade_count ?? 0 }}</span>
              <span v-if="execPerformance.win_rate != null">Win Rate: {{ (execPerformance.win_rate * 100).toFixed(1) }}%</span>
              <span>Realized: &yen;{{ (execPerformance.realized_pnl || 0).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Add Execution Modal (Detail Page) -->
        <div v-if="showAddExecInDetailModal" class="modal-overlay" @click.self="closeAddExecInDetail">
          <div class="modal-content">
            <div class="modal-header">添加策略执行</div>
            <div style="font-size:0.8125rem;color:var(--tr-muted);margin-bottom:0.75rem">
              Stock: {{ position.vt_symbol }}
            </div>
            <div class="input-group">
              <label>Strategy Template</label>
              <select class="input-field" v-model="addExecInDetailTemplateId">
                <option value="">Select template...</option>
                <option v-for="t in addExecInDetailTemplates" :key="t.id" :value="t.id">
                  {{ t.name }}{{ t.is_system ? ' (System)' : '' }}
                </option>
              </select>
            </div>
            <div class="input-group">
              <label>Execution Name (optional)</label>
              <input class="input-field" v-model="addExecInDetailName" type="text" placeholder="e.g. Tail Grid #2" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-outline" @click="closeAddExecInDetail">Cancel</button>
              <button
                class="btn btn-primary"
                :disabled="!addExecInDetailTemplateId || addingExecInDetail"
                @click="addExecInDetail"
              >
                {{ addingExecInDetail ? 'Adding...' : 'Add Execution' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, executionsApi, toast } from '../api/api-client';
import type { ExecutionInfo, ExecutionPerformance, SettingsResponse } from '../api/api-client';
import ExecutionSelector from '../components/ExecutionSelector.vue';

interface StrategyParams {
  base_position_amount?: number;
  add_position_amount?: number;
  add_trigger_pct?: number;
  sell_trigger_pct?: number;
  max_add_count?: number;
  max_position_amount?: number;
  hard_stop_loss_pct?: number;
  enable_auto_add?: boolean;
  enable_auto_sell?: boolean;
  enable_hard_stop?: boolean;
  add_price_type?: string;
  sell_price_type?: string;
}

interface TradeLot {
  id: string;
  batch_index: number;
  locked: boolean;
  entry_price: number;
  entry_volume?: number;
  entry_amount?: number;
  entry_time?: string;
  status: string;
  exit_price?: number;
  pnl?: number;
  pnl_pct?: number;
  sell_trigger_price?: number;
  hard_stop_price?: number;
  sellable?: boolean;
}

interface TemplateResult {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  params: Record<string, any>;
}

interface TlPosition {
  id: string;
  vt_symbol: string;
  stock_name?: string;
  status: string;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  current_price?: number;
  price_change_pct?: number;
  add_count?: number;
  max_add_count?: number;
  strategy_name?: string;
  strategy_instance_id?: string;
}

const route = useRoute();
const isTradeLotView = computed(() => route.path === '/tradelot');

// ── TradeLot Batch View State ──
const tlLoading = ref(true);
const tlError = ref('');
const tlPositions = ref<TlPosition[]>([]);
const tlExpandedIds = ref(new Set<string>());
const tlLots = reactive<Record<string, TradeLot[]>>({});
const tlLotsLoading = reactive<Record<string, boolean>>({});
const lotFilter = ref('all');
const lotFilters = [
  { key: 'all', label: '全部持仓' },
  { key: 'abnormal', label: '异常挂单' },
  { key: 'cleared', label: '已清仓' },
];

// Multi-exec in TradeLot view
const stockExecutionsForTradeLot = reactive<Record<string, ExecutionInfo[]>>({});
const tlExecLoading = reactive<Record<string, boolean>>({});
const tlExecError = reactive<Record<string, string>>({});
const selectedTlExecIds = reactive<Record<string, string>>({});

// Tune params modal
const tlTuneModal = reactive<{ show: boolean; stock: TlPosition | null; loading: boolean; saving: boolean }>({
  show: false, stock: null, loading: false, saving: false,
});
const tlTuneForm = reactive<StrategyParams>({});

// Add exec modal (TradeLot)
const tlAddExecModal = reactive<{ show: boolean; stock: TlPosition | null; templates: TemplateResult[]; saving: boolean }>({
  show: false, stock: null, templates: [], saving: false,
});
const tlAddExecForm = reactive({ templateId: '', name: '' });

const filteredTlPositions = computed(() => {
  if (lotFilter.value === 'all') return tlPositions.value;
  if (lotFilter.value === 'cleared') return tlPositions.value.filter(p => p.status?.toLowerCase() === 'cleared');
  if (lotFilter.value === 'abnormal') return tlPositions.value.filter(p => {
    const s = p.status?.toLowerCase() || '';
    return s === 'pending' || s === 'error' || s === 'stopped';
  });
  return tlPositions.value;
});

function capacityPctTradeLot(p: TlPosition): number {
  const used = p.add_count || 0;
  const max = p.max_add_count || 5;
  return Math.min((used / max) * 100, 100);
}

function sellTriggerProgress(p: TlPosition, lot: TradeLot): number {
  if (!p.current_price || !lot.sell_trigger_price) return 0;
  if (lot.sell_trigger_price <= 0) return 0;
  const entryPrice = lot.entry_price || 0;
  if (entryPrice <= 0) return 0;
  const targetDelta = lot.sell_trigger_price - entryPrice;
  const currentDelta = p.current_price - entryPrice;
  if (targetDelta <= 0) return 0;
  return Math.round((currentDelta / targetDelta) * 100);
}

function lotStatusBadge(status: string): string {
  const s = status?.toLowerCase() || '';
  if (s === 'holding') return 'badge-active';
  if (s === 'pending' || s === 'pending_sell' || s === 'locked') return 'badge-stopped';
  if (s === 'sold') return 'badge-cleared';
  return 'badge-muted';
}

async function loadTradeLotPositions() {
  tlLoading.value = true;
  tlError.value = '';
  try {
    const data = await api.get('/positions');
    tlPositions.value = Array.isArray(data) ? data : (data.items || []);
  } catch (e: any) {
    tlError.value = e.message || 'Failed to load positions';
  }
  tlLoading.value = false;
}

async function toggleTradeLotExpand(posId: string) {
  if (tlExpandedIds.value.has(posId)) {
    tlExpandedIds.value.delete(posId);
  } else {
    tlExpandedIds.value.add(posId);
    // Load trade lots if not loaded
    if (!tlLots[posId]) {
      tlLotsLoading[posId] = true;
      try {
        const data = await api.get(`/positions/${posId}`);
        tlLots[posId] = (data.batches || []).map((b: any) => ({
          ...b,
          sell_trigger_price: b.sell_trigger_price || b.target_sell_price,
          hard_stop_price: b.hard_stop_price,
          sellable: b.sellable !== false,
        }));
      } catch {
        tlLots[posId] = [];
      }
      tlLotsLoading[posId] = false;
    }
    // Load executions if multi-exec enabled
    if (enableMultiExecution.value && !stockExecutionsForTradeLot[posId]) {
      loadTradeLotExecutions(posId);
    }
  }
  tlExpandedIds.value = new Set(tlExpandedIds.value);
}

async function loadTradeLotExecutions(stockId: string) {
  tlExecLoading[stockId] = true;
  tlExecError[stockId] = '';
  try {
    const data = await executionsApi.list(stockId);
    stockExecutionsForTradeLot[stockId] = Array.isArray(data) ? data : [];
    if (stockExecutionsForTradeLot[stockId].length > 0 && !selectedTlExecIds[stockId]) {
      selectedTlExecIds[stockId] = stockExecutionsForTradeLot[stockId][0].id;
    }
  } catch (e: any) {
    tlExecError[stockId] = e.message || 'Failed to load executions';
  }
  tlExecLoading[stockId] = false;
}

function selectTradeLotExec(stockId: string, execId: string) {
  selectedTlExecIds[stockId] = execId;
}

function openAddExecForTradeLot(p: TlPosition) {
  tlAddExecModal.stock = p;
  tlAddExecForm.templateId = '';
  tlAddExecForm.name = '';
  tlAddExecModal.show = true;
  if (tlAddExecModal.templates.length === 0) {
    loadTlAddExecTemplates();
  }
}

async function loadTlAddExecTemplates() {
  try {
    const data = await api.get('/strategies/templates');
    tlAddExecModal.templates = Array.isArray(data) ? data : [];
  } catch {
    tlAddExecModal.templates = [];
  }
}

async function addExecForTradeLot() {
  if (!tlAddExecModal.stock || !tlAddExecForm.templateId) return;
  tlAddExecModal.saving = true;
  try {
    await executionsApi.create({
      stock_id: tlAddExecModal.stock.id,
      strategy_template_id: tlAddExecForm.templateId,
      name: tlAddExecForm.name || undefined,
    });
    toast('Execution added');
    tlAddExecModal.show = false;
    if (tlAddExecModal.stock) {
      delete stockExecutionsForTradeLot[tlAddExecModal.stock.id];
      await loadTradeLotExecutions(tlAddExecModal.stock.id);
    }
  } catch (e: any) {
    toast(e.message || 'Failed to add execution');
  }
  tlAddExecModal.saving = false;
}

async function openTuneParams(p: TlPosition) {
  tlTuneModal.stock = p;
  tlTuneModal.loading = true;
  tlTuneModal.show = true;
  // Reset form
  Object.assign(tlTuneForm, {
    base_position_amount: undefined,
    add_position_amount: undefined,
    add_trigger_pct: undefined,
    sell_trigger_pct: undefined,
    max_add_count: undefined,
    hard_stop_loss_pct: undefined,
  });
  try {
    if (p.strategy_instance_id) {
      const instData = await api.get(`/strategies/instances/${p.strategy_instance_id}`);
      Object.assign(tlTuneForm, instData.params || {});
    }
  } catch {
    // Use empty form
  }
  tlTuneModal.loading = false;
}

async function saveTuneParams() {
  if (!tlTuneModal.stock) return;
  tlTuneModal.saving = true;
  try {
    const stock = tlTuneModal.stock;
    const endpoint = stock.strategy_instance_id
      ? `/strategies/instances/${stock.strategy_instance_id}`
      : `/positions/${stock.id}/params`;
    await api.put(endpoint, { params: { ...tlTuneForm } });
    toast('Parameters saved');
    tlTuneModal.show = false;
  } catch (e: any) {
    toast(e.message || 'Failed to save parameters');
  }
  tlTuneModal.saving = false;
}

async function pauseStrategy(p: TlPosition) {
  try {
    await api.post(`/strategies/instances/${p.strategy_instance_id}/pause`);
    toast('Strategy paused');
  } catch (e: any) {
    toast(e.message || 'Failed to pause strategy');
  }
}

async function clearStock(p: TlPosition) {
  try {
    await api.post(`/positions/${p.id}/clear`);
    toast('Clear stock order sent');
    await loadTradeLotPositions();
  } catch (e: any) {
    toast(e.message || 'Failed to clear stock');
  }
}

// ── Single Position Detail State (unchanged logic, V3-styled) ──
const positionId = computed(() => route.params.id as string | undefined);
const loading = ref(true);
const error = ref('');
const position = ref<any>(null);
const strategyParams = ref<StrategyParams>({});
const editingParams = ref(false);
const savingParams = ref(false);
const lotsLoading = ref(true);
const tradeLots = ref<TradeLot[]>([]);

const editForm = reactive<StrategyParams>({});

// Multi-Execution State
const enableMultiExecution = ref(false);
const allExecutions = ref<ExecutionInfo[]>([]);
const selectedExecutionId = ref<string | null>(null);
const execSelectorLoading = ref(false);
const execSelectorError = ref('');
const execPerformance = ref<ExecutionPerformance | null>(null);
const execPerfLoading = ref(false);
const execPerfError = ref('');

interface ExecutionParams {
  params: StrategyParams;
  strategy_instance_id?: string;
}
const executionParamsCache = reactive<Record<string, ExecutionParams>>({});

// Add execution in detail modal
const showAddExecInDetailModal = ref(false);
const addExecInDetailTemplateId = ref('');
const addExecInDetailName = ref('');
const addExecInDetailTemplates = ref<TemplateResult[]>([]);
const addingExecInDetail = ref(false);

const currentParams = computed<StrategyParams>(() => {
  if (enableMultiExecution.value && selectedExecutionId.value) {
    const cached = executionParamsCache[selectedExecutionId.value];
    if (cached) return cached.params;
  }
  return strategyParams.value;
});

const sortKey = ref('batch_index');
const sortAsc = ref(true);

const sortableColumns = [
  { key: 'batch_index', label: '#' },
  { key: 'entry_price', label: 'Price' },
  { key: 'entry_time', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'pnl', label: 'P&L' },
];

const sortedLots = computed(() => {
  const lots = [...tradeLots.value];
  lots.sort((a: any, b: any) => {
    const va = a[sortKey.value] ?? 0;
    const vb = b[sortKey.value] ?? 0;
    if (typeof va === 'string') return sortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc.value ? (va - vb) : (vb - va);
  });
  return lots;
});

const pnlSummary = computed(() => {
  const total = tradeLots.value.reduce((s, l) => s + (l.pnl || 0), 0);
  const soldCount = tradeLots.value.filter(l => l.status === 'SOLD').length;
  return { total, soldCount, totalCount: tradeLots.value.length };
});

function formatNum(v: any): string {
  if (v == null) return '--';
  const n = Number(v);
  return isNaN(n) ? '--' : n.toFixed(2);
}

function formatDate(d: string | undefined): string {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString(); } catch { return d.slice(0, 10); }
}

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function startEditParams() {
  Object.assign(editForm, { ...currentParams.value });
  editingParams.value = true;
}

function cancelEditParams() {
  editingParams.value = false;
}

async function saveParams() {
  savingParams.value = true;
  try {
    const endpoint = enableMultiExecution.value && selectedExecutionId.value
      ? `/strategies/executions/${selectedExecutionId.value}/params`
      : `/strategies/instances/${position.value.strategy_instance_id}`;
    await api.put(endpoint, { params: { ...editForm } });

    if (enableMultiExecution.value && selectedExecutionId.value) {
      executionParamsCache[selectedExecutionId.value] = {
        ...executionParamsCache[selectedExecutionId.value],
        params: { ...editForm },
      };
    } else {
      strategyParams.value = { ...editForm };
    }
    editingParams.value = false;
    toast('Parameters saved');
  } catch (e: any) {
    toast(e.message || 'Failed to save parameters');
  }
  savingParams.value = false;
}

async function loadSettings() {
  try {
    const data: SettingsResponse = await api.get('/settings');
    enableMultiExecution.value = data.enable_multi_execution_per_stock === true;
  } catch {
    enableMultiExecution.value = false;
  }
}

async function loadExecutions() {
  if (!positionId.value) return;
  execSelectorLoading.value = true;
  execSelectorError.value = '';
  try {
    const data = await executionsApi.list(positionId.value);
    allExecutions.value = Array.isArray(data) ? data : [];
    if (allExecutions.value.length > 0 && !selectedExecutionId.value) {
      selectExecution(allExecutions.value[0].id);
    }
  } catch (e: any) {
    execSelectorError.value = e.message || 'Failed to load executions';
    allExecutions.value = [];
  }
  execSelectorLoading.value = false;
}

async function selectExecution(executionId: string) {
  selectedExecutionId.value = executionId;
  if (!executionParamsCache[executionId]) {
    try {
      const instData = await api.get(`/strategies/executions/${executionId}`);
      executionParamsCache[executionId] = {
        params: instData.params || {},
        strategy_instance_id: instData.strategy_instance_id || instData.id,
      };
    } catch {
      executionParamsCache[executionId] = { params: {} };
    }
  }
  loadExecPerformance(executionId);
}

async function loadExecPerformance(executionId: string) {
  execPerfLoading.value = true;
  execPerfError.value = '';
  try {
    execPerformance.value = await executionsApi.performance(executionId);
  } catch (e: any) {
    execPerfError.value = e.message || 'Failed to load performance';
    execPerformance.value = null;
  }
  execPerfLoading.value = false;
}

async function openAddExecInDetail() {
  addExecInDetailTemplateId.value = '';
  addExecInDetailName.value = '';
  showAddExecInDetailModal.value = true;
  if (addExecInDetailTemplates.value.length === 0) {
    try {
      const data = await api.get('/strategies/templates');
      addExecInDetailTemplates.value = Array.isArray(data) ? data : [];
    } catch {
      addExecInDetailTemplates.value = [];
    }
  }
}

function closeAddExecInDetail() {
  showAddExecInDetailModal.value = false;
}

async function addExecInDetail() {
  if (!addExecInDetailTemplateId.value || !positionId.value) return;
  addingExecInDetail.value = true;
  try {
    await executionsApi.create({
      stock_id: positionId.value,
      strategy_template_id: addExecInDetailTemplateId.value,
      name: addExecInDetailName.value || undefined,
    });
    toast('Execution added');
    showAddExecInDetailModal.value = false;
    await loadExecutions();
  } catch (e: any) {
    toast(e.message || 'Failed to add execution');
  }
  addingExecInDetail.value = false;
}

async function loadPosition() {
  if (!positionId.value) return;
  loading.value = true;
  error.value = '';
  try {
    const data = await api.get(`/positions/${positionId.value}`);
    position.value = data;
    tradeLots.value = data.batches || [];
    lotsLoading.value = false;
    if (data.strategy_instance_id) {
      try {
        const instData = await api.get(`/strategies/instances/${data.strategy_instance_id}`);
        strategyParams.value = instData.params || {};
      } catch {
        strategyParams.value = {};
      }
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load position';
  }
  loading.value = false;
}

onMounted(() => {
  loadSettings();
  if (isTradeLotView.value) {
    loadTradeLotPositions();
  } else if (positionId.value) {
    loadPosition();
  }
});

watch(enableMultiExecution, (val) => {
  if (val && positionId.value) loadExecutions();
});
</script>

<style scoped>
/* ── TradeLot View Styles ── */
.tl-position-card {
  margin-bottom: 0.75rem;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
}
.tl-position-card:hover {
  border-color: rgba(30, 173, 111, 0.25);
}
.tl-row-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
}
.tl-expanded {
  border-color: rgba(30, 173, 111, 0.3);
}

.tl-lots-section {
  background: rgba(11, 14, 20, 0.5);
  border-top: 1px solid var(--tr-border);
  padding: 1rem 1.25rem;
}
.tl-lots-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tl-lot-row {
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.375rem;
  border-radius: var(--tr-radius-sm);
  background: var(--tr-panel);
  border: 1px solid var(--tr-border);
  font-size: 0.8125rem;
}
.tl-base-lot {
  background: rgba(30, 173, 111, 0.04);
  border-color: rgba(30, 173, 111, 0.15);
}
.tl-lot-pending {
  border-style: dashed;
}

.tl-lot-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 600;
}
.tl-lot-green {
  background: rgba(16, 185, 129, 0.15);
  color: var(--tr-down);
}
.tl-lot-muted {
  background: var(--tr-bg);
  color: var(--tr-muted);
}

.tl-lock-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: rgba(245, 158, 11, 0.1);
  color: var(--tr-warning);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 4px;
  font-size: 0.6875rem;
}

/* ── Shared Styles ── */
.param-group {
  margin-bottom: 1rem;
}
.param-group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tr-muted);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
}
.param-item {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0;
  border-bottom: 1px solid var(--tr-border);
  font-size: 0.875rem;
}
.lot-row {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  font-size: 0.8125rem;
}
</style>
