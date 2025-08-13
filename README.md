# Simple OpenAI Realtime Proxy

極簡版 OpenAI Realtime API WebSocket 代理服務，整合 AWS Cognito JWT 認證。

## 🎯 功能特色

- ✅ OpenAI Realtime API WebSocket 代理
- ✅ AWS Cognito JWT 認證整合
- ✅ 支援 4 小時長連接
- ✅ 自動擴展 (AWS App Runner)
- ✅ Docker 容器化
- ✅ 極簡設計 (單文件架構)

## 📁 檔案結構

```
openai-realtime-proxy/
├── server.js          # 核心服務器 (所有功能)
├── package.json        # Node.js 依賴
├── .env.example        # 環境變數範例
├── Dockerfile          # Docker 配置
├── deploy.sh           # AWS App Runner 部署腳本
└── README.md           # 本文件
```

## 🚀 快速開始

### 1. 本地開發

```bash
# 安裝依賴
npm install

# 設置環境變數
cp .env.example .env
# 編輯 .env 填入你的 OpenAI API Key

# 啟動服務
npm start

# 開發模式 (自動重載)
npm run dev
```

### 2. Docker 運行

```bash
# 建置映像
docker build -t simple-openai-realtime-proxy .

# 運行容器
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=your-api-key \
  -e COGNITO_USER_POOL_ID=ap-southeast-1_UwCmj5RYY \
  -e COGNITO_CLIENT_ID=2ju0hh9llp0p3lkeoeom7r0co2 \
  -e COGNITO_REGION=ap-southeast-1 \
  simple-openai-realtime-proxy
```

### 3. AWS App Runner 部署

```bash
# 設置 AWS CLI
aws configure

# 部署到 App Runner
OPENAI_API_KEY=your-api-key ./deploy.sh
```

## 🔧 環境變數

| 變數名 | 說明 | 必需 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI API 密鑰 | ✅ |
| `COGNITO_USER_POOL_ID` | Cognito 用戶池 ID | ✅ |
| `COGNITO_CLIENT_ID` | Cognito 客戶端 ID | ✅ |
| `COGNITO_REGION` | AWS 區域 | ✅ |
| `PORT` | 服務端口 | ❌ (預設: 8080) |
| `NODE_ENV` | 環境模式 | ❌ (預設: development) |

## 🧪 測試連接

### 使用 wscat

```bash
# 安裝 wscat
npm install -g wscat

# 連接測試 (需要有效的 JWT token)
wscat -c "ws://localhost:8080/realtime?token=YOUR_JWT_TOKEN"

# 發送測試訊息
> {"type": "session.update", "session": {"instructions": "You are helpful"}}
```

### 使用 Node.js 腳本

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080/realtime?token=YOUR_JWT_TOKEN');

ws.on('open', () => {
    console.log('✅ Connected!');
    
    // 發送測試訊息
    ws.send(JSON.stringify({
        type: 'session.update',
        session: { instructions: 'You are helpful' }
    }));
});

ws.on('message', (data) => {
    console.log('📨 Received:', JSON.parse(data));
});
```

## 📊 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/health` | GET | 健康檢查 |
| `/` | GET | 服務資訊 |
| `/realtime` | WebSocket | OpenAI Realtime 代理 |

## 🔐 安全特性

- JWT Token 驗證 (透過 URL query parameter 或 Authorization header)
- 每用戶最多 2 個並發連接
- OpenAI API Key 永不暴露到前端
- JWKS 密鑰自動驗證和緩存

## 🚦 限制

- 最大並發連接數: 每用戶 2 個
- 連接超時: 由 OpenAI API 控制
- 記憶體使用: 極簡設計，內存佔用低

## 📈 成本估算

### AWS App Runner 成本
- 基本實例 (0.25 vCPU, 0.5 GB): ~$12/月
- 100 活躍用戶: ~$45/月
- 數據傳輸: $0.09/GB (前 10GB 免費)

## 🐛 故障排除

### 常見問題

1. **連接被拒絕**
   - 檢查 JWT token 是否有效
   - 確認 Cognito 配置正確

2. **OpenAI 連接失敗**
   - 檢查 OpenAI API Key 是否正確
   - 確認網絡連接

3. **健康檢查失敗**
   - 檢查端口是否被占用
   - 查看應用程式日誌

### 查看日誌

```bash
# Docker
docker logs container-name

# AWS App Runner
aws logs tail /aws/apprunner/simple-openai-realtime-proxy \
    --region ap-southeast-1 \
    --follow
```

## 🔄 更新和維護

### 本地更新
```bash
# 拉取最新代碼
git pull

# 重新安裝依賴
npm install

# 重啟服務
npm start
```

### App Runner 更新
重新運行部署腳本即可更新服務。

## 📞 支援

如有問題，請：
1. 檢查本 README 的故障排除部分
2. 查看應用程式日誌
3. 確認所有環境變數都已正確設置

---

**版本**: 1.0.0  
**最後更新**: 2025-08-13  
**License**: MIT