// server.js - 極簡版 OpenAI Realtime WebSocket Proxy
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

class SimpleOpenAIRealtimeProxy {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = null;
        this.connections = new Map(); // 簡單的連接管理
        
        // 初始化 JWKS 客戶端
        this.jwksClient = jwksClient({
            jwksUri: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
            cache: true,
            cacheMaxAge: 10 * 60 * 1000 // 10 分鐘緩存
        });
        
        this.setupRoutes();
        this.setupWebSocketServer();
    }
    
    setupRoutes() {
        // 健康檢查端點 (App Runner 必需)
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'simple-openai-realtime-proxy',
                timestamp: new Date().toISOString(),
                activeConnections: this.connections.size,
                version: process.env.SERVICE_VERSION || '1.0.0'
            });
        });
        
        // 基本資訊端點
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Silent Operator Simple OpenAI Realtime Proxy',
                websocket: '/realtime',
                health: '/health'
            });
        });
    }
    
    setupWebSocketServer() {
        this.wss = new WebSocket.Server({
            server: this.server,
            path: '/realtime',
            verifyClient: async (info) => {
                return await this.verifyClient(info);
            }
        });
        
        this.wss.on('connection', (clientWs, req) => {
            this.handleConnection(clientWs, req);
        });
    }
    
    async verifyClient(info) {
        try {
            // 提取並驗證 JWT token
            const token = this.extractToken(info.req);
            if (!token) {
                console.log('❌ No JWT token provided');
                return false;
            }
            
            // 驗證 Cognito JWT (簡化版)
            const claims = await this.validateCognitoJWT(token);
            if (!claims) {
                console.log('❌ Invalid JWT token');
                return false;
            }
            
            // 基本連接數檢查 (每用戶最多2個連接)
            const userConnections = Array.from(this.connections.values())
                .filter(conn => conn.userId === claims.sub).length;
            
            if (userConnections >= 2) {
                console.log(`❌ User ${claims.sub} connection limit exceeded`);
                return false;
            }
            
            // 附加用戶資訊
            info.req.user = {
                userId: claims.sub,
                username: claims['cognito:username'],
                email: claims.email
            };
            
            console.log(`✅ User authenticated: ${claims['cognito:username']}`);
            return true;
            
        } catch (error) {
            console.error('❌ WebSocket auth error:', error.message);
            return false;
        }
    }
    
    extractToken(req) {
        const url = new URL(req.url, 'http://localhost');
        const tokenFromQuery = url.searchParams.get('token');
        if (tokenFromQuery) return tokenFromQuery;
        
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        
        return null;
    }
    
    // 簡化版 Cognito JWT 驗證
    async validateCognitoJWT(token) {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.header.kid) {
                throw new Error('Invalid token format');
            }
            
            const key = await new Promise((resolve, reject) => {
                this.jwksClient.getSigningKey(decoded.header.kid, (err, key) => {
                    if (err) reject(err);
                    else resolve(key.publicKey || key.rsaPublicKey);
                });
            });
            
            const claims = jwt.verify(token, key, {
                issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
                audience: process.env.COGNITO_CLIENT_ID
            });
            
            return claims;
        } catch (error) {
            console.error('JWT validation failed:', error.message);
            return null;
        }
    }
    
    async handleConnection(clientWs, req) {
        const user = req.user;
        const connectionId = Date.now().toString() + Math.random().toString(36);
        
        console.log(`🔗 New connection: ${user.username}`);
        
        try {
            // 連接到 OpenAI
            const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime', {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            });
            
            // 儲存連接
            this.connections.set(connectionId, {
                clientWs,
                openaiWs,
                userId: user.userId,
                username: user.username,
                startTime: Date.now()
            });
            
            // 設置雙向代理
            this.setupProxy(clientWs, openaiWs, connectionId);
            
        } catch (error) {
            console.error(`❌ OpenAI connection failed:`, error);
            clientWs.close(1011, 'Service unavailable');
        }
    }
    
    setupProxy(clientWs, openaiWs, connectionId) {
        // Client -> OpenAI 代理
        clientWs.on('message', (data) => {
            if (openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.send(data);
            }
        });
        
        // OpenAI -> Client 代理
        openaiWs.on('message', (data) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data);
            }
        });
        
        // 錯誤和關閉處理
        const cleanup = () => {
            const conn = this.connections.get(connectionId);
            if (conn) {
                console.log(`🔌 Connection closed: ${conn.username}`);
                this.connections.delete(connectionId);
            }
            
            if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close();
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
        };
        
        openaiWs.on('error', (error) => {
            console.error('❌ OpenAI error:', error.message);
            cleanup();
        });
        
        clientWs.on('error', (error) => {
            console.error('❌ Client error:', error.message);
        });
        
        openaiWs.on('open', () => {
            const conn = this.connections.get(connectionId);
            if (conn) {
                console.log(`🎉 Full proxy established for: ${conn.username}`);
            }
        });
        
        clientWs.on('close', cleanup);
        openaiWs.on('close', cleanup);
    }
    
    start(port = process.env.PORT || 8080) {
        this.server.listen(port, () => {
            console.log(`🚀 Simple OpenAI Realtime Proxy Server running on port ${port}`);
            console.log(`📡 WebSocket: ws://localhost:${port}/realtime`);
            console.log(`🏥 Health: http://localhost:${port}/health`);
            console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
            console.log(`🔐 Cognito Pool: ${process.env.COGNITO_USER_POOL_ID || '❌ Missing'}`);
        });
    }
}

// 啟動服務
if (require.main === module) {
    // 檢查必要環境變數
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY environment variable is required');
        process.exit(1);
    }
    
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID || !process.env.COGNITO_REGION) {
        console.error('❌ Cognito environment variables are required');
        process.exit(1);
    }
    
    const proxy = new SimpleOpenAIRealtimeProxy();
    proxy.start();
}

module.exports = SimpleOpenAIRealtimeProxy;