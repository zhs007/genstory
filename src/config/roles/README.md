# 角色配置系统使用说明

## 概述

Aria是GenStory系统的前台接待角色，她拥有专门的配置文件来定义她的行为、能力和交互风格。

## Aria配置文件结构

### 基本信息
- **角色ID**: `front_desk`
- **姓名**: Aria
- **显示名称**: 前台接待 Aria
- **表情符号**: 👋
- **版本**: 1.0.0

### AI模型配置
```javascript
model: {
  provider: 'gemini',           // 使用Google Gemini
  modelName: 'gemini-pro',      // 专业版本
  temperature: 0.7,             // 平衡创造性和一致性
  maxTokens: 1024,              // 适合对话交互的长度
  topP: 0.8,                    // 核采样参数
  topK: 30,                     // Top-K采样参数
  frequencyPenalty: 0.1,        // 减少重复
  presencePenalty: 0.1          // 鼓励多样性
}
```

### 核心提示词
Aria的系统提示词包含：
- 身份定义（专业前台接待）
- 核心职责（用户服务、需求转达、进度汇报、成果展示）
- 性格特点（热情开朗、专业细致、善于沟通）
- 沟通风格（温暖友好、专业准确）

### 提示词模板
Aria拥有多个预定义的提示词模板：
- `welcome`: 欢迎新用户
- `requirementGathering`: 收集用户需求
- `progressUpdate`: 更新工作进展
- `resultPresentation`: 展示创作成果

### 交流风格配置
```javascript
communicationStyle: {
  tone: 'friendly',             // 友好的语调
  formality: 'professional',    // 专业的正式度
  creativity: 'medium',         // 中等创造性
  empathy: 'high',             // 高同理心
  responsiveness: 'immediate'   // 即时响应
}
```

### 功能能力
Aria具备三大类能力：
1. **用户交互能力**: 欢迎、收集需求、回答问题、提供指导、收集反馈
2. **团队协调能力**: 传递消息、汇报进度、促进讨论、总结结果
3. **服务管理能力**: 管理期望、处理投诉、建议改进、维护质量

### 行为规则
- **必须遵守**: 保持友好态度、准确传达需求、及时汇报进展等
- **不应该做**: 曲解需求、承诺无法实现功能、泄露信息等
- **特殊情况处理**: 针对用户困惑、团队延迟、用户不满等情况的处理策略

## 如何使用角色配置

### 1. 在代码中加载配置
```javascript
import { getRoleConfig } from './config/roles/index.js';

// 获取Aria的完整配置
const ariaConfig = getRoleConfig('front_desk');

// 获取模型配置
const modelConfig = ariaConfig.model;

// 获取系统提示词
const systemPrompt = ariaConfig.systemPrompt;
```

### 2. 使用ConfigManager
```javascript
import ConfigManager from './config/ConfigManager.js';

const configManager = new ConfigManager();

// 获取详细角色配置
const ariaConfig = configManager.getDetailedRoleConfig('front_desk');

// 获取模型配置
const modelConfig = configManager.getRoleModelConfig('front_desk');

// 获取系统提示词（可包含故事类型特定修饰符）
const prompt = configManager.getRoleSystemPrompt('front_desk', 'sci-fi');

// 获取显示信息
const displayInfo = configManager.getRoleDisplayInfo('front_desk');
```

### 3. 创建AI Agent
```javascript
import { StoryAgent } from './agents/StoryAgents.js';

// 使用Aria配置创建agent
const aria = new StoryAgent('front_desk', configManager);

// agent会自动使用配置中的模型和提示词设置
```

## 扩展角色配置

### 添加新角色
1. 创建新的角色配置文件（如`AlexConfig.js`）
2. 在`src/config/roles/index.js`中注册新角色
3. 使用与Aria相同的配置结构

### 自定义Aria的行为
1. 修改`AriaConfig.js`中的相应配置
2. 调整`systemPrompt`来改变行为模式
3. 修改`communicationStyle`来调整交流风格
4. 更新`capabilities`来启用/禁用功能

### 添加新的提示词模板
```javascript
promptTemplates: {
  // 现有模板...
  
  // 添加新模板
  troubleshooting: `遇到问题了吗？不用担心！我来帮您解决：
  
  请告诉我具体遇到了什么困难，我会尽力为您提供帮助或联系相关专家。`,
  
  feedback: `感谢您的反馈！您的意见对我们非常重要：
  
  {feedback_content}
  
  我们会认真考虑您的建议，持续改进我们的服务。`
}
```

## 性能优化

### 模型参数调优
- 调整`temperature`控制创造性
- 修改`maxTokens`控制回复长度
- 优化`topP`和`topK`平衡多样性和一致性

### 提示词优化
- 使用明确的指令和示例
- 包含角色行为的具体描述
- 添加输出格式要求

### 监控和调试
```javascript
// 启用性能监控
const performanceMetrics = ariaConfig.performanceMetrics;

// 监控响应时间
console.log(`目标响应时间: ${performanceMetrics.responseTime.target}ms`);

// 检查质量标准
console.log(`准确率目标: ${performanceMetrics.qualityStandards.accuracyRate}`);
```

这个配置系统让Aria的行为完全可定制和可扩展，同时保持了清晰的结构和良好的可维护性。
