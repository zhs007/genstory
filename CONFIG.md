# 🔧 配置系统文档

GenStory 项目采用了全新的双层配置系统，将系统配置和角色配置分离，提供更好的灵活性和可维护性。

## 📁 配置文件结构

```
src/config/
├── SystemConfig.js     # 系统配置和角色配置定义
└── ConfigManager.js    # 配置管理器
```

## ⚙️ 系统配置 (SystemConfig)

系统配置包含应用程序的核心设置：

### 服务器配置
```javascript
server: {
  port: 3000,
  host: 'localhost',
  corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
}
```

### 故事生成配置
```javascript
story: {
  maxLength: 2000,          // 最大故事长度（字符）
  minLength: 500,           // 最小故事长度（字符）
  defaultGenre: 'general',  // 默认故事类型
  supportedGenres: [...],   // 支持的故事类型列表
}
```

### SSE配置
```javascript
sse: {
  heartbeatInterval: 30000,  // 心跳间隔（毫秒）
  maxConnections: 100,       // 最大并发连接数
  timeout: 300000           // 连接超时时间（毫秒）
}
```

### 多智能体协调配置
```javascript
orchestrator: {
  maxDiscussionRounds: 3,    // 最大讨论轮次
  discussionTimeout: 120000, // 单轮讨论超时时间（毫秒）
  allowInterruption: true,   // 是否允许用户中途插入建议
  consensusThreshold: 0.8    // 达成共识的阈值
}
```

## 🎭 角色配置 (RoleConfigs)

每个AI角色都有独立的配置，包括：

### 基本信息
```javascript
{
  name: 'Alex',                    // 角色名称
  displayName: '创意总监 Alex',     // 显示名称
  emoji: '👔',                     // 角色图标
  enabled: true,                   // 是否启用
}
```

### 模型配置
```javascript
model: {
  provider: 'gemini',              // AI模型提供商
  modelName: 'gemini-pro',         // 模型名称
  temperature: 0.8,                // 创造性参数 (0.0-1.0)
  maxTokens: 2048,                 // 最大令牌数
  topP: 0.9,                       // 采样参数
  topK: 40                         // 采样参数
}
```

### 系统提示词
每个角色都有专门设计的系统提示词，定义其：
- 角色身份和职责
- 性格特点
- 工作方式
- 交流风格

### 交流风格
```javascript
communicationStyle: {
  tone: 'enthusiastic',            // 语调：enthusiastic, analytical, creative, etc.
  formality: 'professional',       // 正式程度：professional, casual, elegant, etc.
  creativity: 'high'               // 创造性：high, medium, low
}
```

## 🎨 故事类型配置 (GenreConfigurations)

每种故事类型都有特定的配置：

```javascript
'sci-fi': {
  keywords: ['科技', '未来', '太空', ...],     // 关键词
  description: '科幻故事，探索未来科技与人类的关系',
  toneAdjustments: {                          // 语调调整
    creativity: 0.8,
    logic: 0.9,
    emotion: 0.6
  },
  promptModifiers: {                          // 角色特定的提示词修饰符
    creative_director: '注重科技创新和未来想象',
    story_architect: '构建符合科学逻辑的情节',
    // ...
  }
}
```

## 🎛️ 配置管理器 (ConfigManager)

配置管理器提供统一的配置访问接口：

### 主要方法

#### 获取配置
```javascript
configManager.getSystemConfig()          // 获取系统配置
configManager.getRoleConfigs()           // 获取所有角色配置
configManager.getRoleConfig(roleId)      // 获取特定角色配置
configManager.getGenreConfig(genre)      // 获取故事类型配置
```

#### 动态调整
```javascript
// 根据故事类型调整角色prompt
configManager.getAdjustedRolePrompt(roleId, genre)

// 根据故事类型调整模型参数
configManager.getAdjustedModelConfig(roleId, genre)
```

#### 配置验证
```javascript
const validation = configManager.validateConfig()
// 返回: { isValid: boolean, errors: [], warnings: [] }
```

## 🔧 使用配置系统

### 1. 创建智能体
```javascript
// 使用配置管理器创建智能体
const agent = new CreativeDirector('sci-fi');
```

### 2. 动态更新故事类型
```javascript
// 更新单个智能体的故事类型
agent.updateGenre('fantasy');

// 更新整个协调器的故事类型
orchestrator.updateGenre('romance');
```

### 3. 获取角色信息
```javascript
const profile = agent.getProfile();
// 返回角色的完整配置信息
```

## 🌟 配置优势

### 1. 分离关注点
- 系统配置：专注于技术参数
- 角色配置：专注于AI行为定制

### 2. 灵活性
- 每个角色可以使用不同的模型和参数
- 支持运行时动态调整
- 根据故事类型自动优化

### 3. 可维护性
- 集中管理所有配置
- 类型安全的配置验证
- 清晰的配置层次结构

### 4. 扩展性
- 易于添加新角色
- 支持新的故事类型
- 模块化的配置组织

## 🔍 配置示例

### 添加新角色
1. 在 `RoleConfigs` 中添加角色配置
2. 在 `StoryAgents.js` 中创建角色类
3. 在 `MultiAgentOrchestrator.js` 中注册角色

### 添加新故事类型
1. 在 `GenreConfigurations` 中添加类型配置
2. 在 `supportedGenres` 中添加类型名称
3. 为每个角色定义特定的 `promptModifiers`

## 🐛 调试配置

### 使用API端点
```bash
# 获取完整配置信息
GET /api/config

# 验证配置
GET /api/config/validate

# 获取角色信息
GET /api/roles
```

### 配置摘要
```javascript
const summary = configManager.getConfigSummary();
console.log(summary);
```

## 📝 最佳实践

1. **环境变量覆盖**：重要参数支持环境变量覆盖
2. **配置验证**：启动时自动验证配置完整性
3. **故事类型优化**：根据不同类型自动调整AI参数
4. **运行时调整**：支持无需重启的配置更新
5. **文档同步**：配置更改时同步更新文档

这个新的配置系统为GenStory提供了强大而灵活的定制能力，让每个AI角色都能在不同的故事类型中发挥最佳性能。
