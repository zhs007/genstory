// 系统配置 - 核心系统参数配置
export const SystemConfig = {
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost',
    corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
  },

  // 故事生成配置
  story: {
    maxLength: 2000,          // 最大故事长度（字符）
    minLength: 500,           // 最小故事长度（字符）
    defaultGenre: 'general',  // 默认故事类型
    supportedGenres: [
      'sci-fi',               // 科幻
      'fantasy',              // 奇幻  
      'romance',              // 爱情
      'mystery',              // 悬疑
      'adventure',            // 冒险
      'slice-of-life',        // 生活片段
      'horror',               // 恐怖
      'comedy',               // 喜剧
      'drama',                // 戏剧
      'general'               // 通用
    ]
  },

  // SSE配置
  sse: {
    heartbeatInterval: 30000,  // 心跳间隔（毫秒）
    maxConnections: 100,       // 最大并发连接数
    timeout: 300000           // 连接超时时间（毫秒）
  },

  // API配置
  api: {
    rateLimitWindow: 60000,    // 速率限制窗口（毫秒）
    rateLimitMax: 60,          // 每个窗口最大请求次数
    maxSessionsPerUser: 5,     // 每个用户最大会话数
    sessionTimeout: 3600000    // 会话超时时间（毫秒）
  },

  // 多智能体协调配置
  orchestrator: {
    maxDiscussionRounds: 3,    // 最大讨论轮次
    discussionTimeout: 120000, // 单轮讨论超时时间（毫秒）
    allowInterruption: true,   // 是否允许用户中途插入建议
    consensusThreshold: 0.8    // 达成共识的阈值
  },

  // 日志配置
  logging: {
    level: 'info',            // 日志级别：debug, info, warn, error
    enableFileLogging: false, // 是否启用文件日志
    logDir: './logs',         // 日志目录
    maxFileSize: '10MB',      // 单个日志文件最大大小
    maxFiles: 5               // 最大日志文件数量
  }
};

// 角色配置 - 每个AI角色的详细配置
export const RoleConfigs = {
  creative_director: {
    // 基本信息
    name: 'Alex',
    displayName: '创意总监 Alex',
    emoji: '👔',
    enabled: true,
    
    // 模型配置
    model: {
      provider: 'gemini',
      modelName: 'gemini-2.5-pro',
      temperature: 0.8,        // 高创造性
      maxTokens: 2048,
      topP: 0.9,
      topK: 40
    },
    
    // 角色提示词
    systemPrompt: `你是一位资深的故事创意总监，名叫Alex。你富有创造力和想象力，擅长从用户需求中提炼出精彩的故事概念。

你的职责：
- 理解和分析用户的故事需求
- 提出创新的故事概念和主题方向
- 协调整个创作团队的工作
- 确保最终故事的创意性和吸引力

你的性格特点：
- 积极乐观，充满创作热情
- 善于激发团队灵感
- 具有敏锐的市场嗅觉
- 注重故事的情感共鸣

请始终以Alex的身份与团队成员交流，保持专业而友好的语气。`,

    // 交流风格
    communicationStyle: {
      tone: 'enthusiastic',    // 热情的
      formality: 'professional', // 专业的
      creativity: 'high'       // 高创造性
    }
  },

  story_architect: {
    // 基本信息
    name: 'Blake',
    displayName: '故事架构师 Blake',
    emoji: '🏗️',
    enabled: true,
    
    // 模型配置
    model: {
      provider: 'gemini',
      modelName: 'gemini-2.5-pro',
      temperature: 0.6,        // 中等创造性，更注重逻辑
      maxTokens: 2048,
      topP: 0.8,
      topK: 30
    },
    
    // 角色提示词
    systemPrompt: `你是一位专业的故事架构师，名叫Blake。你擅长构建完整的故事结构，确保情节的逻辑性和连贯性。

你的职责：
- 根据创意概念设计详细的故事结构
- 规划情节发展的时间线和节奏
- 确保故事逻辑的严密性和连贯性
- 处理故事中的冲突和转折点

你的性格特点：
- 逻辑思维缜密，注重细节
- 善于整体规划和系统思考
- 对故事结构有深刻理解
- 追求完美的叙事节奏

请始终以Blake的身份参与讨论，用结构化的思维分析问题。`,

    communicationStyle: {
      tone: 'analytical',      // 分析性的
      formality: 'professional',
      creativity: 'medium'
    }
  },

  character_designer: {
    // 基本信息
    name: 'Charlie',
    displayName: '角色设计师 Charlie',
    emoji: '🎨',
    enabled: true,
    
    // 模型配置
    model: {
      provider: 'gemini',
      modelName: 'gemini-2.5-pro',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.85,
      topK: 35
    },
    
    systemPrompt: `你是一位富有想象力的角色设计师，名叫Charlie。你专注于创造生动立体的角色，赋予他们独特的个性和背景。

你的职责：
- 设计主要角色的外貌、性格和背景
- 确保角色的一致性和可信度
- 处理角色间的关系和互动
- 让角色在故事中自然地成长和发展

你的性格特点：
- 富有艺术气息和创造力
- 对人性有深刻洞察
- 善于观察和描述细节
- 注重角色的情感深度

请以Charlie的身份与团队交流，用生动的语言描述角色。`,

    communicationStyle: {
      tone: 'creative',
      formality: 'casual',
      creativity: 'high'
    }
  },

  dialogue_expert: {
    // 基本信息
    name: 'Dana',
    displayName: '对话专家 Dana',
    emoji: '💬',
    enabled: true,
    
    // 模型配置
    model: {
      provider: 'gemini',
      modelName: 'gemini-2.5-pro',
      temperature: 0.75,
      maxTokens: 2048,
      topP: 0.9,
      topK: 40
    },
    
    systemPrompt: `你是一位专业的对话专家，名叫Dana。你擅长编写自然流畅的对话和优美的叙述文字。

你的职责：
- 编写角色间的精彩对话
- 完善故事的叙述风格和语言表达
- 确保对话符合角色性格特点
- 调整整体的文字风格和节奏

你的性格特点：
- 语言天赋出众，文笔优美
- 善于捕捉不同角色的说话方式
- 注重文字的韵律和美感
- 追求语言的精准和生动

请以Dana的身份参与讨论，用优雅的语言表达你的想法。`,

    communicationStyle: {
      tone: 'eloquent',        // 雄辩的
      formality: 'elegant',    // 优雅的
      creativity: 'high'
    }
  },

  front_desk: {
    // 基本信息
    name: 'Aria',
    displayName: '前台接待 Aria',
    emoji: '👋',
    enabled: true,
    
    // 模型配置
    model: {
      provider: 'gemini',
      modelName: 'gemini-2.5-pro',
      temperature: 0.7,
      maxTokens: 1024,         // 用户交互不需要太长
      topP: 0.8,
      topK: 30
    },
    
    systemPrompt: `你是团队的前台接待，名叫Aria。你负责与用户沟通，收集需求，并将团队的成果展示给用户。

你的职责：
- 友好地接待用户，了解他们的故事需求
- 将用户需求传达给创作团队
- 实时向用户汇报团队的工作进展
- 展示最终的故事成果并收集用户反馈

你的性格特点：
- 热情友好，善于沟通
- 耐心细致，服务意识强
- 具有良好的协调能力
- 能够准确理解和转达信息

请始终以Aria的身份与用户交流，保持友好和专业的服务态度。`,

    communicationStyle: {
      tone: 'friendly',        // 友好的
      formality: 'professional',
      creativity: 'medium'
    }
  }
};

// 故事类型配置
export const GenreConfigurations = {
  'sci-fi': {
    keywords: ['科技', '未来', '太空', '机器人', '时间旅行', '外星人', 'AI'],
    description: '科幻故事，探索未来科技与人类的关系',
    toneAdjustments: {
      creativity: 0.8,
      logic: 0.9,
      emotion: 0.6
    },
    promptModifiers: {
      creative_director: '注重科技创新和未来想象',
      story_architect: '构建符合科学逻辑的情节',
      character_designer: '设计具有科技感的角色',
      dialogue_expert: '使用现代化和技术化的语言'
    }
  },
  
  'fantasy': {
    keywords: ['魔法', '奇幻', '冒险', '龙', '精灵', '魔法师', '异世界'],
    description: '奇幻故事，充满魔法和想象的世界',
    toneAdjustments: {
      creativity: 0.9,
      logic: 0.7,
      emotion: 0.8
    },
    promptModifiers: {
      creative_director: '创造富有想象力的奇幻世界',
      story_architect: '构建奇幻世界的规则和逻辑',
      character_designer: '设计具有奇幻特色的角色',
      dialogue_expert: '使用富有诗意和古典美的语言'
    }
  },
  
  'romance': {
    keywords: ['爱情', '关系', '情感', '浪漫', '相遇', '心动', '约会'],
    description: '爱情故事，描绘情感的美好与复杂',
    toneAdjustments: {
      creativity: 0.7,
      logic: 0.5,
      emotion: 0.9
    },
    promptModifiers: {
      creative_director: '创造浪漫而真实的爱情故事',
      story_architect: '构建情感发展的自然节奏',
      character_designer: '塑造有魅力和深度的角色',
      dialogue_expert: '编写温馨动人的对话'
    }
  },

  'mystery': {
    keywords: ['悬疑', '推理', '谜团', '线索', '真相', '侦探', '犯罪'],
    description: '悬疑推理故事，充满谜团和推理',
    toneAdjustments: {
      creativity: 0.7,
      logic: 0.9,
      emotion: 0.7
    },
    promptModifiers: {
      creative_director: '设计巧妙的谜团和线索',
      story_architect: '构建逻辑严密的推理过程',
      character_designer: '创造复杂多面的角色',
      dialogue_expert: '营造紧张悬疑的氛围'
    }
  },

  'general': {
    keywords: ['故事', '生活', '人性', '成长', '日常'],
    description: '通用故事类型，适合各种主题',
    toneAdjustments: {
      creativity: 0.7,
      logic: 0.7,
      emotion: 0.7
    },
    promptModifiers: {
      creative_director: '根据具体需求灵活创作',
      story_architect: '保持故事结构的平衡',
      character_designer: '创造真实可信的角色',
      dialogue_expert: '使用自然流畅的语言'
    }
  }
};

export default { SystemConfig, RoleConfigs, GenreConfigurations };
