import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import configManager from './config/ConfigManager.js';
import MultiAgentOrchestrator from './MultiAgentOrchestrator.js';

dotenv.config();

// 配置全局代理（在任何网络请求之前）
const configureGlobalProxy = () => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  if (proxy) {
    console.log(`🌐 服务器检测到代理配置: ${proxy}`);
    
    // 根据代理类型创建相应的 agent
    let agent;
    if (proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
      agent = new SocksProxyAgent(proxy);
      console.log(`🧦 服务器使用 SOCKS 代理`);
    } else {
      agent = new HttpsProxyAgent(proxy);
      console.log(`🌐 服务器使用 HTTP(S) 代理`);
    }
    
    // 重写全局 fetch 以使用代理
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options = {}) => {
      if (typeof url === 'string' && (url.includes('googleapis.com') || url.includes('google.com'))) {
        options.agent = agent;
        console.log(`🔗 通过代理访问: ${new URL(url).hostname}`);
      }
      return originalFetch(url, options);
    };
    
    return true;
  } else {
    console.log(`🌐 未检测到代理配置，使用直连`);
  }
  return false;
};

// 配置代理
configureGlobalProxy();

const app = express();

// 从配置管理器获取系统配置
const systemConfig = configManager.getSystemConfig();
const port = systemConfig.server.port;

// 中间件
app.use(cors({
  origin: systemConfig.server.corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// 初始化多智能体协调器（默认通用类型）
const orchestrator = new MultiAgentOrchestrator('general');

// 根路径
app.get('/', (req, res) => {
  res.send(`
    <h1>🎭 GenStory - 多角色AI故事生成系统</h1>
    <p>一个基于多智能体协作的AI故事生成系统，每个角色都有独特的专业技能和个性。</p>
    
    <h2>🎪 团队成员</h2>
    <ul>
      <li>👔 创意总监 Alex - 负责整体创意构思和方向把控</li>
      <li>🏗️ 故事架构师 Blake - 负责故事结构和情节设计</li>
      <li>🎨 角色设计师 Charlie - 负责角色塑造和发展</li>
      <li>💬 对话专家 Dana - 负责对话编写和叙述风格</li>
      <li>👋 前台接待 Echo - 负责用户交互和沟通协调</li>
    </ul>

    <h2>🚀 快速开始</h2>
    <p>访问 <a href="/demo">/demo</a> 查看演示界面</p>
    
    <h2>📡 API 端点</h2>
    <h3>会话管理</h3>
    <ul>
      <li><strong>POST /api/session</strong> - 创建新会话</li>
      <li><strong>GET /api/events/:sessionId</strong> - SSE事件流（实时内部通信）</li>
      <li><strong>POST /api/generate/:sessionId</strong> - 生成故事</li>
      <li><strong>POST /api/interrupt/:sessionId</strong> - 插入建议</li>
    </ul>
    
    <h3>配置管理</h3>
    <ul>
      <li><strong>GET /api/config</strong> - 获取系统配置信息</li>
      <li><strong>GET /api/roles</strong> - 获取角色配置信息</li>
      <li><strong>GET /api/genres</strong> - 获取支持的故事类型</li>
      <li><strong>POST /api/genre</strong> - 更新故事类型</li>
      <li><strong>GET /api/config/validate</strong> - 验证配置</li>
    </ul>

    <h2>📖 支持的故事类型</h2>
    <p>科幻、奇幻、爱情、悬疑、冒险、恐怖、喜剧、戏剧等</p>
    
    <p><em>当前版本: v1.0.0 | 配置系统: v2.0</em></p>
  `);
});

// 创建新的故事生成会话
app.post('/api/session', (req, res) => {
  try {
    const userId = req.body.userId || uuidv4();
    const sessionId = orchestrator.createSession(userId);
    
    res.json({
      success: true,
      sessionId,
      userId,
      message: '会话创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SSE事件流 - 实时推送内部沟通
app.get('/api/events/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // 设置SSE头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 发送连接成功消息
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: '已连接到故事生成团队的内部通信频道',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // 注册事件发射器
  orchestrator.setEventEmitter(sessionId, res);

  // 处理客户端断开连接
  req.on('close', () => {
    console.log(`SSE connection closed for session: ${sessionId}`);
  });
});

// 生成故事
app.post('/api/generate/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: '请提供故事需求'
      });
    }

    const response = await orchestrator.generateStory(sessionId, message);
    
    res.json({
      success: true,
      message: '故事生成开始',
      frontDeskResponse: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 用户中途插入建议
app.post('/api/interrupt/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { suggestion } = req.body;

    if (!suggestion) {
      return res.status(400).json({
        success: false,
        error: '请提供建议内容'
      });
    }

    const response = await orchestrator.generateStory(sessionId, suggestion, true);
    
    res.json({
      success: true,
      message: '建议已收到并传达给团队',
      frontDeskResponse: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取会话信息
app.get('/api/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = orchestrator.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    res.json({
      success: true,
      session: {
        userId: session.userId,
        currentPhase: session.currentPhase,
        conversationCount: session.conversationLog.length,
        interruptionCount: session.userInterruptions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取系统配置信息
app.get('/api/config', (req, res) => {
  try {
    const configSummary = configManager.getConfigSummary();
    const agentsInfo = orchestrator.getAgentsInfo();
    const supportedGenres = configManager.getSupportedGenres();
    
    res.json({
      success: true,
      data: {
        system: configSummary,
        agents: agentsInfo,
        supportedGenres,
        currentGenre: orchestrator.genre
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取角色配置信息
app.get('/api/roles', (req, res) => {
  try {
    const roleConfigs = configManager.getRoleConfigs();
    const enabledRoles = configManager.getEnabledRoles();
    
    res.json({
      success: true,
      data: {
        roles: roleConfigs,
        enabled: enabledRoles
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取故事类型配置
app.get('/api/genres', (req, res) => {
  try {
    const genreConfigs = configManager.getGenreConfig();
    const supportedGenres = configManager.getSupportedGenres();
    
    res.json({
      success: true,
      data: {
        supported: supportedGenres,
        configurations: genreConfigs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新故事类型
app.post('/api/genre', (req, res) => {
  try {
    const { genre } = req.body;
    
    if (!genre) {
      return res.status(400).json({
        success: false,
        error: '故事类型不能为空'
      });
    }
    
    const supportedGenres = configManager.getSupportedGenres();
    if (!supportedGenres.includes(genre)) {
      return res.status(400).json({
        success: false,
        error: `不支持的故事类型: ${genre}`
      });
    }
    
    orchestrator.updateGenre(genre);
    
    res.json({
      success: true,
      message: `故事类型已更新为: ${genre}`,
      currentGenre: genre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 验证配置
app.get('/api/config/validate', (req, res) => {
  try {
    const validation = configManager.validateConfig();
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 重试失败的操作
app.post('/api/retry/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = orchestrator.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    if (!session.retryContext) {
      return res.status(400).json({
        success: false,
        error: '没有可重试的操作'
      });
    }

    await orchestrator.retryFailedOperation(sessionId);
    
    res.json({
      success: true,
      message: '重试操作已开始'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 演示页面路由
app.get('/demo', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenStory Demo</title>
    <!-- 添加 Markdown 解析库 -->
    <script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"></script>
    <!-- 添加代码高亮 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            height: 80vh;
        }
        .panel {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-y: auto;
        }
        .chat-panel {
            display: flex;
            flex-direction: column;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #fafafa;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            animation: fadeIn 0.3s ease-in;
            line-height: 1.6;
        }
        .message h1, .message h2, .message h3, .message h4, .message h5, .message h6 {
            margin-top: 0;
            margin-bottom: 0.5em;
            color: #333;
        }
        .message p {
            margin: 0.5em 0;
        }
        .message ul, .message ol {
            margin: 0.5em 0;
            padding-left: 20px;
        }
        .message li {
            margin: 0.25em 0;
        }
        .message blockquote {
            margin: 0.5em 0;
            padding: 0.5em 1em;
            border-left: 4px solid #ddd;
            background-color: #f9f9f9;
            font-style: italic;
        }
        .message code {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .message pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid #ddd;
        }
        .message pre code {
            background-color: transparent;
            padding: 0;
        }
        .message strong {
            font-weight: bold;
        }
        .message em {
            font-style: italic;
        }
        .message table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.5em 0;
        }
        .message table th, .message table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .message table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .user-message {
            background-color: #007bff;
            color: white;
            margin-left: 20%;
        }
        .agent-message {
            background-color: #e9ecef;
            margin-right: 20%;
        }
        .internal-message {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            margin: 5px 0;
            font-size: 0.9em;
        }
        .input-area {
            display: flex;
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        .btn-warning {
            background-color: #ffc107;
            color: #212529;
        }
        .btn:hover {
            opacity: 0.8;
        }
        .status {
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
        }
        h1, h2 {
            color: #333;
            text-align: center;
        }
        .speaker-name {
            font-weight: bold;
            color: #007bff;
        }
        .timestamp {
            font-size: 0.8em;
            color: #666;
            float: right;
        }
        .error-message {
            background-color: #f8d7da !important;
            border-left: 4px solid #dc3545 !important;
            color: #721c24;
        }
        .retry-button-container {
            margin: 10px 0;
            padding: 10px;
            background-color: #f1f3f4;
            border-radius: 5px;
            text-align: center;
        }
        .retry-btn {
            background-color: #ffc107;
            color: #212529;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        .retry-btn:hover {
            background-color: #e0a800;
        }
        .retry-btn:disabled {
            background-color: #6c757d;
            color: white;
            cursor: not-allowed;
        }
        .retry-hint {
            display: block;
            margin-top: 5px;
            color: #6c757d;
            font-size: 12px;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <h1>🎭 GenStory - 多角色AI故事生成系统</h1>
    
    <div class="status" id="status">
        点击"开始新会话"来创建故事生成会话
    </div>
    
    <div class="container">
        <div class="panel chat-panel">
            <h2>💬 用户对话区</h2>
            <div class="messages" id="chatMessages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="描述你想要的故事..." disabled>
                <button class="btn btn-primary" onclick="sendMessage()" disabled id="sendBtn">发送</button>
                <button class="btn btn-warning" onclick="sendInterruption()" disabled id="interruptBtn">插入建议</button>
            </div>
        </div>
        
        <div class="panel">
            <h2>🔍 团队内部沟通</h2>
            <div class="messages" id="internalMessages"></div>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
        <button class="btn btn-primary" onclick="startNewSession()">开始新会话</button>
        <button class="btn" onclick="clearMessages()" style="background-color: #6c757d; color: white;">清空消息</button>
    </div>

    <script>
        let sessionId = null;
        let eventSource = null;
        
        // 配置 Marked 选项
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
        
        // 安全的 HTML 渲染函数
        function renderMarkdown(text) {
            try {
                // 使用 marked 解析 Markdown
                const html = marked.parse(text);
                return html;
            } catch (error) {
                console.error('Markdown 解析错误:', error);
                // 如果解析失败，返回转义的纯文本
                return escapeHtml(text);
            }
        }
        
        // HTML 转义函数，防止 XSS
        function escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        function updateStatus(message, type = 'info') {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status';
            if (type === 'error') {
                status.style.backgroundColor = '#f8d7da';
                status.style.borderColor = '#f5c6cb';
            } else {
                status.style.backgroundColor = '#d4edda';
                status.style.borderColor = '#c3e6cb';
            }
        }
        
        async function startNewSession() {
            try {
                const response = await fetch('/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                const data = await response.json();
                if (data.success) {
                    sessionId = data.sessionId;
                    updateStatus(\`会话已创建: \${sessionId.substring(0, 8)}...\`);
                    connectToEventStream();
                    enableControls();
                } else {
                    updateStatus('创建会话失败: ' + data.error, 'error');
                }
            } catch (error) {
                updateStatus('网络错误: ' + error.message, 'error');
            }
        }
        
        function connectToEventStream() {
            if (eventSource) {
                eventSource.close();
            }
            
            eventSource = new EventSource(\`/api/events/\${sessionId}\`);
            
            eventSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleIncomingMessage(data);
            };
            
            eventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                updateStatus('连接中断，请刷新页面重试', 'error');
            };
        }
        
        function handleIncomingMessage(data) {
            if (data.type === 'user_message') {
                addChatMessage(data.message, data.speaker, false, data.timestamp);
            } else if (data.type === 'internal_communication') {
                addInternalMessage(data.message, data.speaker, data.phase, data.timestamp, data.error, data.retryButton);
            }
        }
        
        function addChatMessage(message, speaker, isUser, timestamp) {
            const messages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'agent-message'}\`;
            
            const time = new Date(timestamp).toLocaleTimeString();
            const renderedMessage = isUser ? escapeHtml(message) : renderMarkdown(message);
            
            messageDiv.innerHTML = \`
                <div class="speaker-name">\${speaker || (isUser ? '用户' : '系统')}</div>
                <div class="message-content">\${renderedMessage}</div>
                <div class="timestamp">\${time}</div>
            \`;
            
            messages.appendChild(messageDiv);
            
            // 如果有代码块，进行语法高亮
            if (!isUser) {
                const codeBlocks = messageDiv.querySelectorAll('pre code');
                codeBlocks.forEach(block => {
                    hljs.highlightElement(block);
                });
            }
            
            messages.scrollTop = messages.scrollHeight;
        }
        
        function addInternalMessage(message, speaker, phase, timestamp, isError, canRetry) {
            const messages = document.getElementById('internalMessages');
            
            // 如果是新的错误且可以重试，先移除所有旧的重试按钮容器
            if (isError && canRetry) {
                const oldRetryContainers = messages.querySelectorAll('.retry-button-container');
                oldRetryContainers.forEach(container => container.remove());
            }
            
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message internal-message\${isError ? ' error-message' : ''}\`;
            
            const time = new Date(timestamp).toLocaleTimeString();
            const phaseText = phase ? \` [\${phase}]\` : '';
            const renderedMessage = renderMarkdown(message);
            
            // 如果是错误且可以重试，添加重试按钮
            let retryButtonHtml = '';
            if (isError && canRetry) {
                retryButtonHtml = \`
                    <div class="retry-button-container">
                        <button class="btn btn-warning retry-btn" onclick="retryFailedOperation()">
                            🔄 重试
                        </button>
                        <small class="retry-hint">点击重试按钮继续执行，或重新开始对话</small>
                    </div>
                \`;
            }
            
            messageDiv.innerHTML = \`
                <div class="speaker-name">\${speaker || '系统'}\${phaseText}</div>
                <div class="message-content">\${renderedMessage}</div>
                \${retryButtonHtml}
                <div class="timestamp">\${time}</div>
            \`;
            
            messages.appendChild(messageDiv);
            
            // 代码块语法高亮
            const codeBlocks = messageDiv.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                hljs.highlightElement(block);
            });
            
            messages.scrollTop = messages.scrollHeight;
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message || !sessionId) return;
            
            addChatMessage(message, '用户', true, new Date().toISOString());
            input.value = '';
            
            try {
                const response = await fetch(\`/api/generate/\${sessionId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                const data = await response.json();
                if (!data.success) {
                    updateStatus('发送失败: ' + data.error, 'error');
                }
            } catch (error) {
                updateStatus('网络错误: ' + error.message, 'error');
            }
        }
        
        async function sendInterruption() {
            const input = document.getElementById('messageInput');
            const suggestion = input.value.trim();
            
            if (!suggestion || !sessionId) return;
            
            addChatMessage(\`[建议] \${suggestion}\`, '用户', true, new Date().toISOString());
            input.value = '';
            
            try {
                const response = await fetch(\`/api/interrupt/\${sessionId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ suggestion })
                });
                
                const data = await response.json();
                if (!data.success) {
                    updateStatus('发送建议失败: ' + data.error, 'error');
                }
            } catch (error) {
                updateStatus('网络错误: ' + error.message, 'error');
            }
        }
        
        async function retryFailedOperation() {
            if (!sessionId) {
                updateStatus('错误: 没有活动会话', 'error');
                return;
            }
            
            try {
                updateStatus('正在重试失败的操作...', 'info');
                
                // 禁用所有重试按钮，避免重复点击
                const retryButtons = document.querySelectorAll('.retry-btn');
                retryButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.textContent = '重试中...';
                });
                
                const response = await fetch(\`/api/retry/\${sessionId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                if (data.success) {
                    updateStatus('重试操作已开始，请等待结果...', 'success');
                    // 成功时按钮保持禁用状态，等待新的消息处理
                } else {
                    updateStatus('重试失败: ' + data.error, 'error');
                    // 失败时恢复按钮状态
                    retryButtons.forEach(btn => {
                        btn.disabled = false;
                        btn.textContent = '🔄 重试';
                    });
                }
            } catch (error) {
                updateStatus('网络错误: ' + error.message, 'error');
                // 网络错误时也要恢复按钮状态
                const retryButtons = document.querySelectorAll('.retry-btn');
                retryButtons.forEach(btn => {
                    btn.disabled = false;
                    btn.textContent = '🔄 重试';
                });
            }
        }
        
        function enableControls() {
            document.getElementById('messageInput').disabled = false;
            document.getElementById('sendBtn').disabled = false;
            document.getElementById('interruptBtn').disabled = false;
        }
        
        function clearMessages() {
            document.getElementById('chatMessages').innerHTML = '';
            document.getElementById('internalMessages').innerHTML = '';
        }
        
        // 绑定回车键发送消息
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
  `);
});

// 启动服务器
app.listen(port, () => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  const proxyStatus = proxy ? `🌐 使用代理: ${proxy}` : '🌐 直连模式';
  
  console.log(`
🎭 GenStory 多角色AI故事生成系统已启动
📡 服务器运行在: http://localhost:${port}
🎪 演示页面: http://localhost:${port}/demo
${proxyStatus}

团队成员:
👔 创意总监 Alex - 负责整体创意构思
🏗️  架构师 Blake - 负责故事结构设计  
🎨 设计师 Charlie - 负责角色塑造
💬 对话师 Dana - 负责对话和叙述
👋 接待员 Echo - 负责用户交互

⚠️ 如果遇到 API 连接问题，请检查：
1. GEMINI_API_KEY 是否正确设置
2. 代理设置是否正确（如果需要）
3. 网络连接是否正常
  `);
});

export default app;
