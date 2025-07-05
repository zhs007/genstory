# GenStory 使用指南

## 🚀 快速启动

### 1. 获取 Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录你的Google账号
3. 创建新的API Key
4. 复制API Key

### 2. 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

在 `.env` 文件中设置你的API Key：
```
GEMINI_API_KEY=你的_API_KEY_这里
PORT=3000
```

### 3. 启动服务

```bash
# 开发模式（推荐）
npm run dev

# 或者生产模式
npm start
```

服务启动后，你会看到类似的输出：
```
🎭 GenStory 多角色AI故事生成系统已启动
📡 服务器运行在: http://localhost:3000
🎪 演示页面: http://localhost:3000/demo
```

## 🎪 使用演示界面

1. **打开浏览器**，访问 http://localhost:3000/demo

2. **创建会话**：点击"开始新会话"按钮

3. **输入故事需求**：在左侧输入框中描述你想要的故事类型，例如：
   - "我想要一个关于时间旅行的科幻故事"
   - "创作一个温馨的家庭故事"
   - "写一个悬疑推理小说"

4. **观察团队协作**：右侧会实时显示5个AI角色的内部讨论过程

5. **插入建议**：在故事创作过程中，你可以随时输入建议并点击"插入建议"

## 🎭 了解团队角色

### 👔 创意总监 Alex
- **职责**：分析用户需求，提出创意方向和整体概念
- **特点**：富有创意，善于把握故事主题
- **何时发言**：收到用户需求后首先分析

### 🏗️ 故事架构师 Blake  
- **职责**：设计故事结构框架，规划情节发展
- **特点**：逻辑清晰，注重结构合理性
- **何时发言**：基于创意总监的分析进行结构设计

### 🎨 角色设计师 Charlie
- **职责**：创造角色，设计背景故事和性格特征
- **特点**：善于心理分析，创造立体角色
- **何时发言**：基于故事结构创造相关角色

### 💬 对话专家 Dana
- **职责**：编写对话，优化叙述语言和风格
- **特点**：语言敏感，表达生动
- **何时发言**：最后润色故事的语言表达

### 👋 前台接待 Echo
- **职责**：与用户交流，协调团队沟通
- **特点**：友好专业，善于沟通
- **何时发言**：始终与用户保持互动

## 💡 使用技巧

### 有效的故事需求描述

**好的例子**：
- "创作一个发生在未来城市的爱情故事，男主角是机器人工程师，女主角是艺术家"
- "写一个关于小女孩和她的魔法宠物的奇幻冒险故事"
- "我想要一个发生在古代中国的武侠故事，主角是个年轻的剑客"

**需要改进的例子**：
- "写个故事" (太宽泛)
- "要很长很长的故事" (缺乏具体方向)

### 有效的中途建议

**好的建议**：
- "可以加入一些悬疑元素"
- "希望结局更加温暖一些"
- "能不能让主角更加勇敢"
- "故事背景可以设在海边小镇"

**时机把握**：
- 在角色讨论阶段提出角色相关建议
- 在结构设计阶段提出情节建议
- 任何时候都可以提出整体方向调整

## 🔧 API 使用示例

如果你想直接使用API而不是演示界面：

### 创建会话
```javascript
const response = await fetch('http://localhost:3000/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const { sessionId } = await response.json();
```

### 连接事件流
```javascript
const eventSource = new EventSource(`http://localhost:3000/api/events/${sessionId}`);
eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);
};
```

### 生成故事
```javascript
await fetch(`http://localhost:3000/api/generate/${sessionId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: "我想要一个科幻故事" 
  })
});
```

## 🐛 常见问题

### Q: 提示"请确保已设置 GEMINI_API_KEY 环境变量"
A: 检查 `.env` 文件是否存在且包含正确的API Key

### Q: 角色没有回应或回应很慢
A: 可能是网络问题或API配额限制，请稍等片刻或检查API Key是否有效

### Q: SSE连接中断
A: 刷新页面重新创建会话，这是正常现象

### Q: 想要修改角色的性格
A: 编辑 `src/agents/StoryAgents.js` 文件中对应角色的 `systemPrompt`

## 🎯 高级用法

### 自定义角色
你可以修改 `src/agents/StoryAgents.js` 来调整角色的性格和专业领域。

### 调整讨论流程
修改 `src/MultiAgentOrchestrator.js` 中的 `conductInternalDiscussion` 方法来改变角色间的协作流程。

### 添加新的API端点
在 `src/server.js` 中添加新的路由处理器。

## 📞 获取帮助

如果遇到问题：
1. 检查控制台错误信息
2. 确认网络连接和API Key
3. 查看项目的GitHub Issues
4. 重启服务试试

祝你创作愉快！🎉
