import { v4 as uuidv4 } from 'uuid';
import configManager from './config/ConfigManager.js';
import { 
  CreativeDirector, 
  StoryArchitect, 
  CharacterDesigner, 
  DialogueExpert, 
  FrontDesk 
} from './agents/StoryAgents.js';

class MultiAgentOrchestrator {
  constructor(genre = 'general') {
    this.genre = genre;
    this.config = configManager.getSystemConfig();
    
    // 根据配置创建启用的智能体
    this.agents = {};
    const enabledRoles = configManager.getEnabledRoles();
    
    enabledRoles.forEach(roleId => {
      switch(roleId) {
        case 'creative_director':
          this.agents.creativeDirector = new CreativeDirector(genre);
          break;
        case 'story_architect':
          this.agents.storyArchitect = new StoryArchitect(genre);
          break;
        case 'character_designer':
          this.agents.characterDesigner = new CharacterDesigner(genre);
          break;
        case 'dialogue_expert':
          this.agents.dialogueExpert = new DialogueExpert(genre);
          break;
        case 'front_desk':
          this.agents.frontDesk = new FrontDesk(genre);
          break;
      }
    });
    
    this.sessions = new Map(); // 存储用户会话
    this.eventEmitters = new Map(); // 存储SSE连接
    
    // 验证必需的角色是否存在
    this.validateAgents();
  }

  /**
   * 验证必需的智能体是否正确创建
   */
  validateAgents() {
    const requiredAgents = ['frontDesk']; // 前台是必需的
    for (const agentKey of requiredAgents) {
      if (!this.agents[agentKey]) {
        throw new Error(`必需的智能体 ${agentKey} 未能创建`);
      }
    }
  }

  /**
   * 获取所有智能体的配置信息
   */
  getAgentsInfo() {
    const agentsInfo = {};
    for (const [key, agent] of Object.entries(this.agents)) {
      agentsInfo[key] = agent.getProfile();
    }
    return agentsInfo;
  }

  /**
   * 更新故事类型，重新配置所有智能体
   * @param {string} newGenre - 新的故事类型
   */
  updateGenre(newGenre) {
    const oldGenre = this.genre;
    this.genre = newGenre;
    
    console.log(`🎨 更新故事类型: ${oldGenre} → ${newGenre}`);
    console.log(`   影响的角色数量: ${Object.keys(this.agents).length}`);
    
    for (const [agentKey, agent] of Object.entries(this.agents)) {
      console.log(`   📱 更新角色 ${agentKey} (${agent.name})`);
      agent.updateGenre(newGenre);
    }
    
    console.log(`✅ 所有角色已切换到 "${newGenre}" 模式`);
  }

  // 创建新的故事生成会话
  createSession(userId) {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      userId,
      storyContext: {},
      conversationLog: [],
      currentPhase: 'initial',
      userInterruptions: [],
      // 新增：重试支持
      retryContext: null,  // 保存失败时的上下文
      failedAt: null,      // 失败的阶段
      lastError: null      // 最后的错误信息
    });
    
    // 添加会话创建日志
    console.log(`📝 创建新会话: ${sessionId}`);
    console.log(`   用户ID: ${userId}`);
    console.log(`   故事类型: ${this.genre}`);
    console.log(`   可用角色: ${Object.keys(this.agents).join(', ')}`);
    
    return sessionId;
  }

  // 设置SSE事件发射器
  setEventEmitter(sessionId, emitter) {
    this.eventEmitters.set(sessionId, emitter);
  }

  // 发送内部通信事件
  emitInternalCommunication(sessionId, data) {
    const emitter = this.eventEmitters.get(sessionId);
    if (emitter) {
      emitter.write(`data: ${JSON.stringify({
        type: 'internal_communication',
        ...data,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  }

  // 发送用户消息事件
  emitUserMessage(sessionId, data) {
    const emitter = this.eventEmitters.get(sessionId);
    if (emitter) {
      emitter.write(`data: ${JSON.stringify({
        type: 'user_message',
        ...data,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  }

  // 主要的故事生成流程
  async generateStory(sessionId, userInput, isInterruption = false) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // 添加流程开始日志
    console.log(`🚀 开始故事生成流程`);
    console.log(`   会话ID: ${sessionId}`);
    console.log(`   用户输入: ${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}`);
    console.log(`   是否为中断: ${isInterruption}`);
    console.log(`   当前阶段: ${session.currentPhase}`);

    // 如果是用户中断，记录中断信息
    if (isInterruption) {
      session.userInterruptions.push({
        input: userInput,
        timestamp: new Date().toISOString(),
        phase: session.currentPhase
      });
      
      this.emitUserMessage(sessionId, {
        message: `用户插入建议: ${userInput}`,
        speaker: 'User'
      });
      
      console.log(`⚡ 用户中断处理: 在 ${session.currentPhase} 阶段收到建议`);
    }

    // 前台接待首先回应用户
    console.log(`👋 前台接待 ${this.agents.frontDesk.name} 开始处理请求...`);
    const frontDeskResult = await this.agents.frontDesk.generateResponse(
      isInterruption ? 
        `用户在故事创作过程中提出了建议: "${userInput}"。请友好地确认收到，并告知会将建议传达给团队。` :
        userInput
    );

    // 检查前台接待是否出错
    if (!frontDeskResult.success) {
      this.emitUserMessage(sessionId, {
        message: `前台接待暂时无法响应：${frontDeskResult.error.message}`,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole(),
        error: true
      });
      throw new Error(`前台接待出错: ${frontDeskResult.error.message}`);
    }

    const frontDeskResponse = frontDeskResult.content;

    this.emitUserMessage(sessionId, {
      message: frontDeskResponse,
      speaker: this.agents.frontDesk.getName(),
      role: this.agents.frontDesk.getRole()
    });

    // Aria向团队传达需求分析
    console.log(`🎯 [Aria] 开始向团队传达需求分析...`);
    
    const requirementAnalysisResult = await this.agents.frontDesk.generateResponse(
      `现在请你作为需求分析师，将用户的需求："${userInput}" 进行深度分析和整理，然后向创作团队传达。

请按以下格式整理需求：
1. 故事类型和基调
2. 关键设定要素  
3. 角色和情节要求
4. 用户的情感期望
5. 推荐的创作重点

请生成一个专业的团队沟通消息，告诉团队成员具体应该如何创作。记住：不要自己创作故事，而是给团队明确的创作指导。`
    );

    if (requirementAnalysisResult.success) {
      this.emitInternalCommunication(sessionId, {
        phase: 'requirement_analysis',
        message: requirementAnalysisResult.content,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole()
      });
    } else {
      // 如果Aria的分析失败，使用简化版本
      this.emitInternalCommunication(sessionId, {
        phase: 'requirement_analysis', 
        message: `🎯 **Aria向团队传达用户需求**\n\n用户需求："${userInput}"\n\n请团队成员根据用户需求开始创作工作。`,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole()
      });
    }

    // 开始内部讨论流程
    const ariaAnalysis = requirementAnalysisResult.success ? requirementAnalysisResult.content : `用户需求：${userInput}`;
    await this.conductInternalDiscussion(sessionId, userInput, ariaAnalysis, isInterruption);

    return frontDeskResponse;
  }

  // 内部讨论流程
  async conductInternalDiscussion(sessionId, originalUserInput, ariaAnalysis, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    // 阶段1：创意总监分析需求
    this.emitInternalCommunication(sessionId, {
      phase: 'creative_analysis',
      message: '📝 创意总监开始分析Aria传达的需求...'
    });

    const creativeResult = await this.agents.creativeDirector.generateResponse(
      `Aria（前台需求分析师）传达的分析：
"${ariaAnalysis}"

原始用户输入："${originalUserInput}"${isInterruption ? ' (这是一个中途建议)' : ''}

请基于Aria的专业分析，提出创意方向和整体概念。`
    );

    if (!creativeResult.success) {
      // 保存重试上下文
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'creativeDirector',
        completedPhases: [] // 创意分析阶段失败，没有完成的阶段
      };
      session.failedAt = 'creative_analysis';
      session.lastError = creativeResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'creative_analysis',
        message: `创意总监遇到问题：${creativeResult.error.message}`,
        speaker: this.agents.creativeDirector.getName(),
        role: this.agents.creativeDirector.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return; // 中断流程
    }

    const creativeAnalysis = creativeResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'creative_analysis',
      message: creativeAnalysis,
      speaker: this.agents.creativeDirector.getName(),
      role: this.agents.creativeDirector.getRole()
    });

    // 阶段2：架构师设计故事结构
    this.emitInternalCommunication(sessionId, {
      phase: 'story_structure',
      message: '故事架构师开始设计故事结构...'
    });

    const structureResult = await this.agents.storyArchitect.generateResponse(
      `基于创意总监的分析: "${creativeAnalysis}"
      请设计具体的故事结构和情节框架。`
    );

    if (!structureResult.success) {
      // 保存重试上下文
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'storyArchitect',
        completedPhases: [
          { phase: 'creative_analysis', result: creativeAnalysis }
        ]
      };
      session.failedAt = 'story_structure';
      session.lastError = structureResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'story_structure',
        message: `故事架构师遇到问题：${structureResult.error.message}`,
        speaker: this.agents.storyArchitect.getName(),
        role: this.agents.storyArchitect.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return; // 中断流程
    }

    const structureDesign = structureResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'story_structure',
      message: structureDesign,
      speaker: this.agents.storyArchitect.getName(),
      role: this.agents.storyArchitect.getRole()
    });

    // 阶段3：角色设计师创造角色
    this.emitInternalCommunication(sessionId, {
      phase: 'character_design',
      message: '角色设计师开始创造角色...'
    });

    const characterResult = await this.agents.characterDesigner.generateResponse(
      `基于故事结构: "${structureDesign}"
      请设计主要角色及其特征。`
    );

    if (!characterResult.success) {
      // 保存重试上下文
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'characterDesigner',
        completedPhases: [
          { phase: 'creative_analysis', result: creativeAnalysis },
          { phase: 'story_structure', result: structureDesign }
        ]
      };
      session.failedAt = 'character_design';
      session.lastError = characterResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'character_design',
        message: `角色设计师遇到问题：${characterResult.error.message}`,
        speaker: this.agents.characterDesigner.getName(),
        role: this.agents.characterDesigner.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return; // 中断流程
    }

    const characterDesign = characterResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'character_design',
      message: characterDesign,
      speaker: this.agents.characterDesigner.getName(),
      role: this.agents.characterDesigner.getRole()
    });

    // 阶段4：对话专家润色表达
    this.emitInternalCommunication(sessionId, {
      phase: 'dialogue_polish',
      message: '对话专家开始优化故事表达...'
    });

    const dialogueResult = await this.agents.dialogueExpert.generateResponse(
      `基于角色设计: "${characterDesign}"
      请为故事编写精彩的对话和叙述。`
    );

    if (!dialogueResult.success) {
      // 保存重试上下文
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'dialogueExpert',
        completedPhases: [
          { phase: 'creative_analysis', result: creativeAnalysis },
          { phase: 'story_structure', result: structureDesign },
          { phase: 'character_design', result: characterDesign }
        ]
      };
      session.failedAt = 'dialogue_polish';
      session.lastError = dialogueResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'dialogue_polish',
        message: `对话专家遇到问题：${dialogueResult.error.message}`,
        speaker: this.agents.dialogueExpert.getName(),
        role: this.agents.dialogueExpert.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return; // 中断流程
    }

    const dialoguePolish = dialogueResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'dialogue_polish',
      message: dialoguePolish,
      speaker: this.agents.dialogueExpert.getName(),
      role: this.agents.dialogueExpert.getRole()
    });

    // 阶段5：团队总结和最终呈现
    const finalStory = await this.synthesizeFinalStory(sessionId, {
      creative: creativeAnalysis,
      structure: structureDesign,
      characters: characterDesign,
      dialogue: dialoguePolish
    });

    // 前台接待向用户展示最终结果
    const finalResult = await this.agents.frontDesk.generateResponse(
      `团队已经完成了故事创作，最终成果是: "${finalStory}"
      请向用户友好地展示这个结果，并询问是否需要调整。`
    );

    if (!finalResult.success) {
      this.emitUserMessage(sessionId, {
        message: `前台接待在展示结果时遇到问题：${finalResult.error.message}`,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole(),
        error: true
      });
      return;
    }

    const finalPresentation = finalResult.content;

    this.emitUserMessage(sessionId, {
      message: finalPresentation,
      speaker: this.agents.frontDesk.getName(),
      role: this.agents.frontDesk.getRole(),
      finalStory: finalStory
    });

    // 更新会话状态
    session.conversationLog.push({
      userInput,
      finalStory,
      timestamp: new Date().toISOString()
    });
  }

  // 综合最终故事
  async synthesizeFinalStory(sessionId, components) {
    this.emitInternalCommunication(sessionId, {
      phase: 'final_synthesis',
      message: '正在综合各部门的成果，生成最终故事...'
    });

    // 这里可以用另一个模型调用来综合所有组件
    const synthesis = `
创意概念: ${components.creative}

故事结构: ${components.structure}

角色设计: ${components.characters}

对话润色: ${components.dialogue}
    `.trim();

    return synthesis;
  }

  // 获取会话信息
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // 清理会话
  closeSession(sessionId) {
    this.sessions.delete(sessionId);
    this.eventEmitters.delete(sessionId);
  }

  // 重试失败的流程
  async retryFailedOperation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.retryContext) {
      throw new Error('没有可重试的操作');
    }

    console.log(`🔄 重试失败的操作: ${session.failedAt}`);
    console.log(`   会话ID: ${sessionId}`);
    console.log(`   失败的Agent: ${session.retryContext.failedAgent}`);
    console.log(`   已完成阶段: ${session.retryContext.completedPhases.length}`);

    // 重置错误状态
    session.lastError = null;
    session.currentPhase = session.failedAt;

    // 发送重试开始消息
    this.emitInternalCommunication(sessionId, {
      phase: session.failedAt,
      message: `🔄 正在重试 ${session.retryContext.failedAgent} 的操作...`,
      speaker: 'System',
      role: 'system',
      retry: true
    });

    // 根据失败的阶段继续执行
    try {
      await this.continueFromPhase(sessionId, session.retryContext);
    } catch (error) {
      console.error(`❌ 重试失败: ${error.message}`);
      
      this.emitInternalCommunication(sessionId, {
        phase: session.failedAt,
        message: `重试失败：${error.message}。您可以再次点击重试按钮或重新开始对话。`,
        speaker: 'System',
        role: 'system',
        error: true,
        canRetry: true,
        retryButton: true
      });
    }
  }

  // 从特定阶段继续执行
  async continueFromPhase(sessionId, retryContext) {
    const { originalUserInput, ariaAnalysis, isInterruption, failedAgent, completedPhases } = retryContext;
    const session = this.sessions.get(sessionId);

    // 重新构建已完成阶段的结果
    let creativeAnalysis, structureDesign, characterDesign;
    
    completedPhases.forEach(phase => {
      switch (phase.phase) {
        case 'creative_analysis':
          creativeAnalysis = phase.result;
          break;
        case 'story_structure':
          structureDesign = phase.result;
          break;
        case 'character_design':
          characterDesign = phase.result;
          break;
      }
    });

    // 根据失败的Agent重新开始相应阶段
    switch (failedAgent) {
      case 'creativeDirector':
        await this.executeCreativePhase(sessionId, originalUserInput, ariaAnalysis, isInterruption);
        break;
      case 'storyArchitect':
        await this.executeStructurePhase(sessionId, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption);
        break;
      case 'characterDesigner':
        await this.executeCharacterPhase(sessionId, structureDesign, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption);
        break;
      case 'dialogueExpert':
        await this.executeDialoguePhase(sessionId, characterDesign, structureDesign, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption);
        break;
    }
  }

  // 拆分各个阶段为独立方法以便重试
  async executeCreativePhase(sessionId, originalUserInput, ariaAnalysis, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    const creativeResult = await this.agents.creativeDirector.generateResponse(
      `Aria（前台需求分析师）传达的分析：
"${ariaAnalysis}"

原始用户输入："${originalUserInput}"${isInterruption ? ' (这是一个中途建议)' : ''}

请基于Aria的专业分析，提出创意方向和整体概念。`
    );

    if (!creativeResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'creativeDirector',
        completedPhases: []
      };
      session.failedAt = 'creative_analysis';
      session.lastError = creativeResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'creative_analysis',
        message: `创意总监遇到问题：${creativeResult.error.message}`,
        speaker: this.agents.creativeDirector.getName(),
        role: this.agents.creativeDirector.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const creativeAnalysis = creativeResult.content;
    this.emitInternalCommunication(sessionId, {
      phase: 'creative_analysis',
      message: creativeAnalysis,
      speaker: this.agents.creativeDirector.getName(),
      role: this.agents.creativeDirector.getRole()
    });

    // 继续下一阶段
    await this.executeStructurePhase(sessionId, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption);
  }

  async executeStructurePhase(sessionId, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    this.emitInternalCommunication(sessionId, {
      phase: 'story_structure',
      message: '故事架构师开始设计故事结构...'
    });

    const structureResult = await this.agents.storyArchitect.generateResponse(
      `基于创意总监的分析: "${creativeAnalysis}"
      请设计具体的故事结构和情节框架。`
    );

    if (!structureResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'storyArchitect',
        completedPhases: [
          { phase: 'creative_analysis', result: creativeAnalysis }
        ]
      };
      session.failedAt = 'story_structure';
      session.lastError = structureResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'story_structure',
        message: `故事架构师遇到问题：${structureResult.error.message}`,
        speaker: this.agents.storyArchitect.getName(),
        role: this.agents.storyArchitect.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const structureDesign = structureResult.content;
    this.emitInternalCommunication(sessionId, {
      phase: 'story_structure',
      message: structureDesign,
      speaker: this.agents.storyArchitect.getName(),
      role: this.agents.storyArchitect.getRole()
    });

    // 继续下一阶段
    await this.executeCharacterPhase(sessionId, structureDesign, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption);
  }

  async executeCharacterPhase(sessionId, structureDesign, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    this.emitInternalCommunication(sessionId, {
      phase: 'character_design',
      message: '角色设计师开始创造角色...'
    });

    const characterResult = await this.agents.characterDesigner.generateResponse(
      `基于故事结构: "${structureDesign}"
      请设计主要角色及其特征。`
    );

    if (!characterResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'characterDesigner',
        completedPhases: [
          { phase: 'creative_analysis', result: creativeAnalysis },
          { phase: 'story_structure', result: structureDesign }
        ]
      };
      session.failedAt = 'character_design';
      session.lastError = characterResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'character_design',
        message: `角色设计师遇到问题：${characterResult.error.message}`,
        speaker: this.agents.characterDesigner.getName(),
        role: this.agents.characterDesigner.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const characterDesign = characterResult.content;
    this.emitInternalCommunication(sessionId, {
      phase: 'character_design',
      message: characterDesign,
      speaker: this.agents.characterDesigner.getName(),
      role: this.agents.characterDesigner.getRole()
    });

    // 继续下一阶段
    await this.executeDialoguePhase(sessionId, characterDesign, structureDesign, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption);
  }

  async executeDialoguePhase(sessionId, characterDesign, structureDesign, creativeAnalysis, originalUserInput, ariaAnalysis, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    this.emitInternalCommunication(sessionId, {
      phase: 'dialogue_polish',
      message: '对话专家开始优化故事表达...'
    });

    const dialogueResult = await this.agents.dialogueExpert.generateResponse(
      `基于角色设计: "${characterDesign}"
      请为故事编写精彩的对话和叙述。`
    );

    if (!dialogueResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'dialogueExpert',
        completedPhases: [
          { phase: 'creative_analysis', result: creativeAnalysis },
          { phase: 'story_structure', result: structureDesign },
          { phase: 'character_design', result: characterDesign }
        ]
      };
      session.failedAt = 'dialogue_polish';
      session.lastError = dialogueResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'dialogue_polish',
        message: `对话专家遇到问题：${dialogueResult.error.message}`,
        speaker: this.agents.dialogueExpert.getName(),
        role: this.agents.dialogueExpert.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const dialoguePolish = dialogueResult.content;
    this.emitInternalCommunication(sessionId, {
      phase: 'dialogue_polish',
      message: dialoguePolish,
      speaker: this.agents.dialogueExpert.getName(),
      role: this.agents.dialogueExpert.getRole()
    });

    // 完成最终故事生成
    await this.completeFinalStory(sessionId, {
      creative: creativeAnalysis,
      structure: structureDesign,
      characters: characterDesign,
      dialogue: dialoguePolish
    });
  }

  async completeFinalStory(sessionId, components) {
    const session = this.sessions.get(sessionId);
    
    // 阶段5：团队总结和最终呈现
    const finalStory = await this.synthesizeFinalStory(sessionId, components);

    // 前台接待向用户展示最终结果
    const finalResult = await this.agents.frontDesk.generateResponse(
      `团队已经完成了故事创作，最终成果是: "${finalStory}"
      请向用户友好地展示这个结果，并询问是否需要调整。`
    );

    if (!finalResult.success) {
      this.emitUserMessage(sessionId, {
        message: `前台接待在展示结果时遇到问题：${finalResult.error.message}`,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole(),
        error: true
      });
      return;
    }

    const finalPresentation = finalResult.content;

    this.emitUserMessage(sessionId, {
      message: finalPresentation,
      speaker: this.agents.frontDesk.getName(),
      role: this.agents.frontDesk.getRole(),
      finalStory: finalStory
    });

    // 更新会话状态
    session.conversationLog.push({
      userInput: session.retryContext?.originalUserInput || 'retry',
      finalStory,
      timestamp: new Date().toISOString()
    });

    // 清理重试上下文
    session.retryContext = null;
    session.failedAt = null;
    session.lastError = null;
  }
}

export default MultiAgentOrchestrator;
