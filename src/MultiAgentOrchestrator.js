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
    this.genre = newGenre;
    for (const agent of Object.values(this.agents)) {
      agent.updateGenre(newGenre);
    }
  }

  // 创建新的故事生成会话
  createSession(userId) {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      userId,
      storyContext: {},
      conversationLog: [],
      currentPhase: 'initial',
      userInterruptions: []
    });
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
    }

    // 前台接待首先回应用户
    const frontDeskResponse = await this.agents.frontDesk.generateResponse(
      isInterruption ? 
        `用户在故事创作过程中提出了建议: "${userInput}"。请友好地确认收到，并告知会将建议传达给团队。` :
        userInput
    );

    this.emitUserMessage(sessionId, {
      message: frontDeskResponse,
      speaker: this.agents.frontDesk.getName(),
      role: this.agents.frontDesk.getRole()
    });

    // 开始内部讨论流程
    await this.conductInternalDiscussion(sessionId, userInput, isInterruption);

    return frontDeskResponse;
  }

  // 内部讨论流程
  async conductInternalDiscussion(sessionId, userInput, isInterruption) {
    const session = this.sessions.get(sessionId);
    
    // 阶段1：创意总监分析需求
    this.emitInternalCommunication(sessionId, {
      phase: 'creative_analysis',
      message: '创意总监开始分析用户需求...'
    });

    const creativeAnalysis = await this.agents.creativeDirector.generateResponse(
      `用户输入: "${userInput}"${isInterruption ? ' (这是一个中途建议)' : ''}
      请分析这个需求，提出创意方向和整体概念。`
    );

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

    const structureDesign = await this.agents.storyArchitect.generateResponse(
      `基于创意总监的分析: "${creativeAnalysis}"
      请设计具体的故事结构和情节框架。`
    );

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

    const characterDesign = await this.agents.characterDesigner.generateResponse(
      `基于故事结构: "${structureDesign}"
      请设计主要角色及其特征。`
    );

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

    const dialoguePolish = await this.agents.dialogueExpert.generateResponse(
      `基于角色设计: "${characterDesign}"
      请为故事编写精彩的对话和叙述。`
    );

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
    const finalPresentation = await this.agents.frontDesk.generateResponse(
      `团队已经完成了故事创作，最终成果是: "${finalStory}"
      请向用户友好地展示这个结果，并询问是否需要调整。`
    );

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
}

export default MultiAgentOrchestrator;
