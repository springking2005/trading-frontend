# TraderGrid 移动端 H5 完整版

## 入口

- 桌面 Web：`/index.html` 或 `/#/dashboard`
- 移动端 H5：`/mobile.html#/dashboard`

移动端 H5 使用独立 Vue 入口 `src/mobile-main.ts` 和壳层 `src/MobileApp.vue`，复用现有业务页面与接口，覆盖：登录、驾驶舱、交易工作台、持仓/批次、持仓详情、策略中心、系统设置。

## 本地运行

```bash
cd trading-frontend
npm run dev:h5
# 浏览器访问 http://localhost:3000/mobile.html#/dashboard
```

## 构建/部署

```bash
cd trading-frontend
npm run build:h5
```

构建产物在 `dist/`，其中 `dist/mobile.html` 是移动端入口。部署时需保留 `/api` 与 `/ws` 反向代理到后端。

## 安全边界

- H5 与桌面 Web 共享后端 `/api/v1`，不会绕过后端风控。
- WebSocket 使用首包鉴权，不把 token 放在 URL。
- 实盘/模拟环境仍以后端设置和交易服务硬门控为准。
