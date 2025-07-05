import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import configManager from './config/ConfigManager.js';
import MultiAgentOrchestrator from './MultiAgentOrchestrator.js';

dotenv.config();

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

// 演示页面路由
app.get('/demo', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenStory Demo</title>
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
                addInternalMessage(data.message, data.speaker, data.phase, data.timestamp);
            }
        }
        
        function addChatMessage(message, speaker, isUser, timestamp) {
            const messages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'agent-message'}\`;
            
            const time = new Date(timestamp).toLocaleTimeString();
            messageDiv.innerHTML = \`
                <div class="speaker-name">\${speaker || (isUser ? '用户' : '系统')}</div>
                <div>\${message}</div>
                <div class="timestamp">\${time}</div>
            \`;
            
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }
        
        function addInternalMessage(message, speaker, phase, timestamp) {
            const messages = document.getElementById('internalMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message internal-message';
            
            const time = new Date(timestamp).toLocaleTimeString();
            const phaseText = phase ? \` [\${phase}]\` : '';
            
            messageDiv.innerHTML = \`
                <div class="speaker-name">\${speaker || '系统'}\${phaseText}</div>
                <div>\${message}</div>
                <div class="timestamp">\${time}</div>
            \`;
            
            messages.appendChild(messageDiv);
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
  console.log(`
🎭 GenStory 多角色AI故事生成系统已启动
📡 服务器运行在: http://localhost:${port}
🎪 演示页面: http://localhost:${port}/demo

团队成员:
👔 创意总监 Alex - 负责整体创意构思
🏗️  架构师 Blake - 负责故事结构设计  
🎨 设计师 Charlie - 负责角色塑造
💬 对话师 Dana - 负责对话和叙述
👋 接待员 Echo - 负责用户交互

请确保已设置 GEMINI_API_KEY 环境变量！
  `);
});

export default app;
