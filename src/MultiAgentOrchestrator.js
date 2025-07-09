import { v4 as uuidv4 } from 'uuid';
import configManager from './config/ConfigManager.js';
import { 
  CreativeDirector, 
  StoryArchitect, 
  CharacterDesigner, 
  CreativeEditor,
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
        case 'creative_editor':
          this.agents.creativeEditor = new CreativeEditor(genre);
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
      currentPhase: 'requirement_gathering', // 改为需求收集阶段
      userInterruptions: [],
      // 新增：需求收集状态
      requirementGathering: {
        isComplete: false,           // 需求收集是否完成
        userWantsToStart: false,     // 用户是否明确要求开始创作
        collectedRequirements: {     // 已收集的需求
          storyBackground: null,     // 故事背景
          characterDetails: null,    // 角色定位
          targetAudience: null,      // 目标群体
          narrativeModel: null,      // 叙事模型
          storyCore: null           // 故事内核
        },
        currentQuestion: null,       // 当前正在询问的问题
        questionIndex: 0            // 问题索引
      },
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

    // 根据当前阶段决定处理方式
    if (session.currentPhase === 'requirement_gathering' && !session.requirementGathering.isComplete) {
      // 需求收集阶段
      console.log(`📋 [Aria] 进行需求收集阶段...`);
      
      // 如果是第一次对话，Aria先自我介绍并开始提问
      if (session.requirementGathering.questionIndex === 0 && session.requirementGathering.currentQuestion === null) {
        // 初次见面，开始第一个问题
        session.requirementGathering.currentQuestion = 'storyBackground';
        const questions = this.getRequirementQuestions();
        const firstQuestion = questions[0];
        
        const welcomeResponse = await this.agents.frontDesk.generateResponse(
          `这是用户的初始需求："${userInput}"。请先友好地打招呼，简单介绍自己是Aria，然后说明需要了解一些信息来帮助团队创作，接着问第一个问题："${firstQuestion.question}"`
        );

        if (!welcomeResponse.success) {
          this.emitUserMessage(sessionId, {
            message: `前台接待暂时无法响应：${welcomeResponse.error.message}`,
            speaker: this.agents.frontDesk.getName(),
            role: this.agents.frontDesk.getRole(),
            error: true
          });
          throw new Error(`前台接待出错: ${welcomeResponse.error.message}`);
        }

        this.emitUserMessage(sessionId, {
          message: welcomeResponse.content,
          speaker: this.agents.frontDesk.getName(),
          role: this.agents.frontDesk.getRole(),
          requirementGathering: {
            phase: 'started',
            questionKey: firstQuestion.key,
            questionIndex: 0,
            totalQuestions: questions.length
          }
        });
        
        return welcomeResponse.content;
      } else {
        // 继续需求收集流程
        await this.handleRequirementGathering(sessionId, userInput);
        return; // handleRequirementGathering 会处理所有响应
      }
    }

    // 如果是用户中断（在团队协作阶段），记录中断信息
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

    // 团队协作阶段 - 前台接待回应用户
    console.log(`👋 前台接待 ${this.agents.frontDesk.name} 开始处理请求...`);
    const frontDeskResult = await this.agents.frontDesk.generateResponse(
      isInterruption ? 
        `用户在故事创作过程中提出了建议: "${userInput}"。请友好地确认收到，并告知会将建议传达给团队。` :
        `用户说："${userInput}"。请确认收到并告知即将开始团队协作创作。`
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

    // 开始或继续团队协作
    await this.startTeamCollaboration(sessionId, userInput);
    
    return frontDeskResponse;
  }

  // 开始团队协作流程
  async startTeamCollaboration(sessionId, userInput) {
    const session = this.sessions.get(sessionId);
    
    // 构建完整的需求分析，包括收集的信息
    let fullRequirementAnalysis = userInput;
    
    if (session.requirementGathering && session.requirementGathering.collectedRequirements) {
      const collected = session.requirementGathering.collectedRequirements;
      fullRequirementAnalysis = `用户最新输入："${userInput}"

之前收集的详细需求信息：
${collected.storyBackground ? `\n故事背景：${collected.storyBackground}` : ''}
${collected.characterDetails ? `\n角色设定：${collected.characterDetails}` : ''}
${collected.targetAudience ? `\n目标群体：${collected.targetAudience}` : ''}
${collected.narrativeModel ? `\n叙事模型：${collected.narrativeModel}` : ''}
${collected.storyCore ? `\n故事内核：${collected.storyCore}` : ''}`;
    }
    
    // Aria向团队传达需求分析
    console.log(`🎯 [Aria] 开始向团队传达需求分析...`);
    
    const requirementAnalysisResult = await this.agents.frontDesk.generateResponse(
      `现在请你作为需求分析师，将收集到的完整需求信息进行深度分析和整理，然后向创作团队传达：

${fullRequirementAnalysis}

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
        message: `🎯 **Aria向团队传达用户需求**\n\n${fullRequirementAnalysis}\n\n请团队成员根据用户需求开始创作工作。`,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole()
      });
    }

    // 开始内部讨论流程
    const ariaAnalysis = requirementAnalysisResult.success ? requirementAnalysisResult.content : fullRequirementAnalysis;
    await this.conductInternalDiscussion(sessionId, userInput, ariaAnalysis, false);
  }

  // 内部讨论流程 - 头脑风暴模式
  async conductInternalDiscussion(sessionId, originalUserInput, ariaAnalysis, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    // 阶段1：Blake(架构师)发散思维 - 提供结构方案
    this.emitInternalCommunication(sessionId, {
      phase: 'brainstorm_structure',
      message: '🏗️ Blake开始基于需求提供多个结构方案...'
    });

    const structureResult = await this.agents.storyArchitect.generateResponse(
      `Aria传达的用户需求分析：
"${ariaAnalysis}"

原始用户输入："${originalUserInput}"

作为故事架构师，请在头脑风暴阶段提供3-5个不同的结构方案创意。每个方案要有独特的结构特点和适用场景。现在是发散思维阶段，请提供多样化的选择。`
    );

    if (!structureResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'storyArchitect',
        completedPhases: []
      };
      session.failedAt = 'brainstorm_structure';
      session.lastError = structureResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'brainstorm_structure',
        message: `Blake遇到问题：${structureResult.error.message}`,
        speaker: this.agents.storyArchitect.getName(),
        role: this.agents.storyArchitect.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const blakeProposals = structureResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'brainstorm_structure',
      message: blakeProposals,
      speaker: this.agents.storyArchitect.getName(),
      role: this.agents.storyArchitect.getRole()
    });

    // 阶段2：Charlie(角色设计师)发散思维 - 提供角色方案
    this.emitInternalCommunication(sessionId, {
      phase: 'brainstorm_characters',
      message: '🎨 Charlie开始提供多个角色设计方案...'
    });

    const characterResult = await this.agents.characterDesigner.generateResponse(
      `用户需求分析：
"${ariaAnalysis}"

Blake的结构方案：
"${blakeProposals}"

作为角色设计师，请在头脑风暴阶段提供3-5个不同的角色设计构想。每个方案要有独特的角色特色和故事价值。现在是发散思维阶段，请提供多样化的角色创意。`
    );

    if (!characterResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'characterDesigner',
        completedPhases: [
          { phase: 'brainstorm_structure', result: blakeProposals }
        ]
      };
      session.failedAt = 'brainstorm_characters';
      session.lastError = characterResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'brainstorm_characters',
        message: `Charlie遇到问题：${characterResult.error.message}`,
        speaker: this.agents.characterDesigner.getName(),
        role: this.agents.characterDesigner.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const charlieProposals = characterResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'brainstorm_characters',
      message: charlieProposals,
      speaker: this.agents.characterDesigner.getName(),
      role: this.agents.characterDesigner.getRole()
    });

    // 阶段3：Elena(编辑反思者)质疑和完善
    if (this.agents.creativeEditor) {
      this.emitInternalCommunication(sessionId, {
        phase: 'critique_analysis',
        message: '🔍 Elena开始对方案进行建设性质疑和分析...'
      });

      const critiqueResult = await this.agents.creativeEditor.generateResponse(
        `用户需求：
"${ariaAnalysis}"

Blake的结构方案：
"${blakeProposals}"

Charlie的角色方案：
"${charlieProposals}"

作为编辑反思者，请对以上方案进行建设性质疑：
1. 分析各方案的优势和潜在问题
2. 从读者、市场、可行性等角度提出质疑
3. 提供具体的改进建议
4. 为Kairos的最终决策提供参考

记住：要建设性地帮助完善方案，而不是否定创意。`
      );

      if (!critiqueResult.success) {
        session.retryContext = {
          originalUserInput,
          ariaAnalysis,
          isInterruption,
          failedAgent: 'creativeEditor',
          completedPhases: [
            { phase: 'brainstorm_structure', result: blakeProposals },
            { phase: 'brainstorm_characters', result: charlieProposals }
          ]
        };
        session.failedAt = 'critique_analysis';
        session.lastError = critiqueResult.error;
        
        this.emitInternalCommunication(sessionId, {
          phase: 'critique_analysis',
          message: `Elena遇到问题：${critiqueResult.error.message}`,
          speaker: this.agents.creativeEditor.getName(),
          role: this.agents.creativeEditor.getRole(),
          error: true,
          canRetry: true,
          retryButton: true
        });
        return;
      }

      const elenaAnalysis = critiqueResult.content;

      this.emitInternalCommunication(sessionId, {
        phase: 'critique_analysis',
        message: elenaAnalysis,
        speaker: this.agents.creativeEditor.getName(),
        role: this.agents.creativeEditor.getRole()
      });

      // 保存Elena的分析结果
      session.elenaAnalysis = elenaAnalysis;
    }

    // 阶段4：Kairos(创意总监)最终决策 - 确定3个初案
    this.emitInternalCommunication(sessionId, {
      phase: 'final_decision',
      message: '🎨 Kairos基于团队讨论做出最终决策...'
    });

    const decisionPrompt = `头脑风暴讨论总结：

用户需求分析（Aria）：
"${ariaAnalysis}"

Blake的结构方案：
"${blakeProposals}"

Charlie的角色方案：
"${charlieProposals}"

${this.agents.creativeEditor ? `Elena的质疑分析：
"${session.elenaAnalysis || '暂无Elena分析'}"` : ''}

作为创意总监，请做出最终决策：
1. 综合所有团队成员的贡献
2. 确定最终的3个初案方向
3. 为每个初案明确核心特色和价值主张
4. 说明选择理由

格式：
初案A：[创意方向] - [核心特色] - [目标受众匹配]
初案B：[创意方向] - [核心特色] - [目标受众匹配]  
初案C：[创意方向] - [核心特色] - [目标受众匹配]`;

    const decisionResult = await this.agents.creativeDirector.generateResponse(decisionPrompt);

    if (!decisionResult.success) {
      session.retryContext = {
        originalUserInput,
        ariaAnalysis,
        isInterruption,
        failedAgent: 'creativeDirector',
        completedPhases: [
          { phase: 'brainstorm_structure', result: blakeProposals },
          { phase: 'brainstorm_characters', result: charlieProposals }
        ]
      };
      session.failedAt = 'final_decision';
      session.lastError = decisionResult.error;
      
      this.emitInternalCommunication(sessionId, {
        phase: 'final_decision',
        message: `Kairos遇到问题：${decisionResult.error.message}`,
        speaker: this.agents.creativeDirector.getName(),
        role: this.agents.creativeDirector.getRole(),
        error: true,
        canRetry: true,
        retryButton: true
      });
      return;
    }

    const finalDecision = decisionResult.content;

    this.emitInternalCommunication(sessionId, {
      phase: 'final_decision',
      message: finalDecision,
      speaker: this.agents.creativeDirector.getName(),
      role: this.agents.creativeDirector.getRole()
    });

    // 阶段5：Aria向用户展示3个初案
    const presentationResult = await this.agents.frontDesk.generateResponse(
      `团队头脑风暴完成！Kairos确定的3个初案：
"${finalDecision}"

请向用户展示这3个初案：
1. 用友好的方式介绍3个不同的创意方向
2. 突出每个方案的特色和优势
3. 让用户选择最喜欢的方向
4. 说明选择后我们将进入详细创作阶段`
    );

    if (!presentationResult.success) {
      this.emitUserMessage(sessionId, {
        message: `Aria在展示初案时遇到问题：${presentationResult.error.message}`,
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole(),
        error: true
      });
      return;
    }

    const finalPresentation = presentationResult.content;

    this.emitUserMessage(sessionId, {
      message: finalPresentation,
      speaker: this.agents.frontDesk.getName(),
      role: this.agents.frontDesk.getRole(),
      proposals: finalDecision
    });

    // 更新会话阶段为等待用户选择
    session.currentPhase = 'proposal_selection';
    session.proposals = finalDecision;

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

    // 直接完成最终故事生成
    await this.completeFinalStory(sessionId, {
      creative: creativeAnalysis,
      structure: structureDesign,
      characters: characterDesign
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

  // 需求收集的问题模板
  getRequirementQuestions() {
    return [
      {
        key: 'storyBackground',
        question: `您好！我是Aria，很高兴为您服务！在开始创作之前，我需要了解一些关键信息来确保我们的团队能为您创作出最满意的作品。

首先，请告诉我关于故事背景的想法：
• 故事发生在什么时代？（现代、古代、未来等）
• 地理位置在哪里？（城市、乡村、特定国家等）
• 有特定的历史事件背景吗？

请尽可能详细地描述，这将帮助我们的团队更好地构建故事世界。`,
        followUp: '如果您还没想好具体细节，也可以告诉我大概的方向，我们可以一起完善。'
      },
      {
        key: 'characterDetails',
        question: `很好！现在让我们来聊聊角色设定：
• 主角的基本信息：年龄、性别、职业
• 国籍或文化背景
• 性格特点或独特之处
• 是否有特定的角色原型或参考？

如果有多个重要角色，也请一并告诉我。`,
        followUp: '角色是故事的灵魂，越详细越能帮助我们创作出有血有肉的人物。'
      },
      {
        key: 'targetAudience',
        question: `接下来是关于读者群体的考虑：
• 这个故事主要是给什么年龄段的人看？
• 希望传达给特定群体吗？（比如青少年、职场人士等）
• 需要考虑特定的文化偏好或价值观吗？
• 希望读者在看完后有什么感受？

了解目标读者能帮我们调整故事的语言风格和内容深度。`,
        followUp: '如果没有特定要求，我们可以按照通用大众的喜好来创作。'
      },
      {
        key: 'narrativeModel',
        question: `现在来确定叙事方式：
• 您希望用什么视角来讲述？（第一人称、第三人称全知等）
• 时间线安排：线性叙述 还是 多时间线交织？
• 结构偏好：单一主角推进 还是 多角色视角切换？
• 故事节奏：快节奏冒险 还是 细腻情感描述？

这将决定故事的整体呈现方式。`,
        followUp: '不同的叙事方式会带来完全不同的阅读体验，请根据您的喜好选择。'
      },
      {
        key: 'storyCore',
        question: `最后，让我们确定故事的内核：
• 想要探讨的主题（爱情、友情、成长、正义等）
• 希望传达的情感内核（温暖、激励、反思、娱乐等）
• 故事的整体色调（明亮温馨、深沉严肃、轻松幽默等）
• 最希望读者记住的是什么？

这是故事的灵魂所在，会贯穿整个创作过程。`,
        followUp: '一个清晰的主题能让故事更有感染力和深度。'
      }
    ];
  }

  // 检查用户是否表达了开始创作的意愿
  checkUserWantsToStart(userInput) {
    const startKeywords = [
      '开始', '开始创作', '开始工作', '开始写', '开始吧',
      '可以开始了', '够了', '就这样', '开始生成',
      '让他们开始', '让团队开始', '开始制作'
    ];
    
    const lowerInput = userInput.toLowerCase();
    return startKeywords.some(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
  }

  // 分析用户回答并提取需求信息
  analyzeUserResponse(userInput, questionKey) {
    // 这里可以进行更复杂的NLP分析
    // 目前先简单返回用户的回答
    return {
      hasContent: userInput.trim().length > 0,
      content: userInput.trim(),
      isVague: userInput.trim().length < 10 // 简单判断是否过于简略
    };
  }

  // 需求收集主流程
  async handleRequirementGathering(sessionId, userInput) {
    const session = this.sessions.get(sessionId);
    const { requirementGathering } = session;
    const questions = this.getRequirementQuestions();

    // 检查用户是否想要跳过收集，直接开始创作
    if (this.checkUserWantsToStart(userInput)) {
      requirementGathering.userWantsToStart = true;
      
      // 检查是否有足够的基本信息
      const collectedCount = Object.values(requirementGathering.collectedRequirements)
        .filter(req => req !== null).length;
      
      if (collectedCount < 2) {
        // 信息太少，建议继续收集
        const response = await this.agents.frontDesk.generateResponse(
          `用户说："${userInput}"，似乎想要开始创作了。但目前收集到的信息还比较少（只有${collectedCount}项），建议用户至少再提供一些基本信息。请友好地建议用户再完善一下，或者询问是否确实要以现有信息开始创作。`
        );

        this.emitUserMessage(sessionId, {
          message: response.success ? response.content : '建议您再提供一些基本信息，这样我们的团队能创作出更符合您期望的作品。您也可以明确告诉我"就以现在的信息开始创作"。',
          speaker: this.agents.frontDesk.getName(),
          role: this.agents.frontDesk.getRole(),
          requirementGathering: {
            canProceed: true,
            suggestion: '建议继续完善信息'
          }
        });
        return;
      }

      // 信息足够，确认开始创作
      requirementGathering.isComplete = true;
      session.currentPhase = 'team_collaboration';
      
      const confirmResponse = await this.agents.frontDesk.generateResponse(
        `用户确认要开始创作。已收集的需求信息：${JSON.stringify(requirementGathering.collectedRequirements)}。请友好地确认收到，并告知即将开始团队协作创作。`
      );

      this.emitUserMessage(sessionId, {
        message: confirmResponse.success ? confirmResponse.content : '好的！我已经收到您的信息，现在就开始让我们的专业团队为您创作。请稍候...',
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole(),
        requirementGathering: {
          completed: true
        }
      });

      // 开始团队协作
      await this.startTeamCollaboration(sessionId, userInput);
      return;
    }

    // 处理当前问题的回答
    if (requirementGathering.currentQuestion !== null) {
      const currentQ = questions[requirementGathering.questionIndex];
      const analysis = this.analyzeUserResponse(userInput, currentQ.key);
      
      if (analysis.hasContent) {
        requirementGathering.collectedRequirements[currentQ.key] = analysis.content;
        
        // 如果回答过于简略，给出提示
        if (analysis.isVague) {
          const clarifyResponse = await this.agents.frontDesk.generateResponse(
            `用户回答了"${userInput}"，但信息比较简略。请友好地确认收到，并适当引导用户提供更多细节，或者询问是否这样就足够了。`
          );

          this.emitUserMessage(sessionId, {
            message: clarifyResponse.success ? clarifyResponse.content : `我记录了您的回答："${userInput}"。如果您能提供更多细节就更好了，这样我们能创作得更精准。当然，如果您觉得这样就够了，我也可以继续下一个问题。`,
            speaker: this.agents.frontDesk.getName(),
            role: this.agents.frontDesk.getRole(),
            requirementGathering: {
              recorded: analysis.content,
              needMoreDetail: true
            }
          });
          return;
        }
      }
    }

    // 继续下一个问题或结束收集
    requirementGathering.questionIndex++;
    
    if (requirementGathering.questionIndex >= questions.length) {
      // 所有问题都问完了
      requirementGathering.isComplete = true;
      session.currentPhase = 'team_collaboration';
      
      const summaryResponse = await this.agents.frontDesk.generateResponse(
        `已经收集完所有需求信息：${JSON.stringify(requirementGathering.collectedRequirements)}。请向用户总结收集到的信息，并询问是否可以开始创作，或者还需要修改什么。`
      );

      this.emitUserMessage(sessionId, {
        message: summaryResponse.success ? summaryResponse.content : '太好了！我已经收集了所有关键信息。现在我可以开始让团队为您创作了，还是您想要修改或补充什么信息？',
        speaker: this.agents.frontDesk.getName(),
        role: this.agents.frontDesk.getRole(),
        requirementGathering: {
          allCollected: true,
          readyToStart: true
        }
      });
      return;
    }

    // 问下一个问题
    const nextQuestion = questions[requirementGathering.questionIndex];
    requirementGathering.currentQuestion = nextQuestion.key;
    
    const questionResponse = await this.agents.frontDesk.generateResponse(
      `现在需要询问用户关于"${nextQuestion.key}"的问题。请用友好自然的方式问这个问题："${nextQuestion.question}"，并可以加上这个提示："${nextQuestion.followUp}"`
    );

    this.emitUserMessage(sessionId, {
      message: questionResponse.success ? questionResponse.content : nextQuestion.question,
      speaker: this.agents.frontDesk.getName(),
      role: this.agents.frontDesk.getRole(),
      requirementGathering: {
        questionKey: nextQuestion.key,
        questionIndex: requirementGathering.questionIndex,
        totalQuestions: questions.length
      }
    });
  }
}

export default MultiAgentOrchestrator;
