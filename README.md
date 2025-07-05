# 🎭 GenStory - 多角色AI故事生成系统

一个基于Node.js的多智能体AI故事生成系统，使用Google Gemini模型。系统采用多角色协作的方式生成故事，每个AI角色都有独特的专业职责，通过内部讨论来创造高质量的故事内容。

## ✨ 特性

- **多角色协作**: 5个专业AI角色分工合作
- **实时通信**: 使用SSE(Server-Sent Events)实时展示内部讨论过程
- **用户交互**: 用户可以随时插入建议，影响故事发展
- **专业分工**: 每个角色专注于特定领域（创意、结构、角色、对话、用户服务）
- **透明过程**: 用户可以看到完整的创作思考过程

## 🎪 团队成员

| 角色 | 姓名 | 职责 |
|------|------|------|
| 👔 创意总监 | Alex | 整体创意构思和方向把控 |
| 🏗️ 故事架构师 | Blake | 故事结构和情节设计 |
| 🎨 角色设计师 | Charlie | 角色塑造和发展 |
| 💬 对话专家 | Dana | 对话编写和叙述风格 |
| 👋 前台接待 | Aria | 用户交互和沟通协调 |

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- Google Gemini API Key

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd genstory
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，添加你的 Gemini API Key
```

4. **启动服务**
```bash
# 开发模式
npm run dev

# 生产模式  
npm start
```

5. **访问应用**
- 服务器: http://localhost:3000
- 演示界面: http://localhost:3000/demo

## 📡 API 接口

### 创建会话
```http
POST /api/session
Content-Type: application/json

{
  "userId": "optional-user-id"
}
```

### 连接事件流 (SSE)
```http
GET /api/events/{sessionId}
```

### 生成故事
```http
POST /api/generate/{sessionId}
Content-Type: application/json

{
  "message": "我想要一个关于时间旅行的科幻故事"
}
```

### 插入建议
```http
POST /api/interrupt/{sessionId}
Content-Type: application/json

{
  "suggestion": "可以加入一些悬疑元素"
}
```

## 🎯 使用流程

1. **创建会话**: 调用 `/api/session` 创建新的故事生成会话
2. **连接事件流**: 通过 `/api/events/{sessionId}` 连接SSE，接收实时更新
3. **提交需求**: 向 `/api/generate/{sessionId}` 发送故事需求
4. **观察讨论**: 通过SSE接收团队内部讨论的实时消息
5. **插入建议**: 随时通过 `/api/interrupt/{sessionId}` 提供建议
6. **获得结果**: 接收最终的故事创作成果

## 🔧 项目结构

```
genstory/
├── src/
│   ├── agents/
│   │   ├── BaseAgent.js          # 基础智能体类
│   │   └── StoryAgents.js        # 专业角色智能体
│   ├── MultiAgentOrchestrator.js # 多智能体协调器
│   └── server.js                 # Express服务器
├── package.json
├── .env.example
└── README.md
```

## 🎨 演示界面

访问 `/demo` 可以体验完整的Web界面，包括：

- **用户对话区**: 与前台接待Aria交流，提交故事需求
- **内部沟通区**: 实时观察5个AI角色的讨论过程
- **建议插入**: 在故事创作过程中随时提供建议
- **会话管理**: 创建新会话、查看状态

## 🔄 工作流程

1. **需求分析**: 创意总监Alex分析用户需求，提出创意方向
2. **结构设计**: 架构师Blake设计故事的整体结构和情节框架
3. **角色创造**: 设计师Charlie塑造主要角色及其特征
4. **对话润色**: 对话师Dana编写精彩的对话和叙述
5. **成果展示**: 接待员Aria向用户展示最终成果并收集反馈

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **AI模型**: Google Gemini Pro
- **实时通信**: Server-Sent Events (SSE)
- **前端**: 原生HTML/CSS/JavaScript
- **包管理**: npm

## 📝 开发说明

### 添加新角色

1. 在 `src/agents/StoryAgents.js` 中创建新的角色类
2. 在 `MultiAgentOrchestrator.js` 中注册新角色
3. 修改讨论流程以包含新角色的参与

### 自定义讨论流程

修改 `MultiAgentOrchestrator.js` 中的 `conductInternalDiscussion` 方法来调整角色间的交互流程。

### 扩展API

在 `server.js` 中添加新的路由和处理逻辑。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License