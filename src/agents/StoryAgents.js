import BaseAgent from './BaseAgent.js';
import configManager from '../config/ConfigManager.js';

// 故事创意总监 - 负责整体故事构思和方向
export class CreativeDirector extends BaseAgent {
  constructor(genre = 'general') {
    super('creative_director', genre);
  }

  /**
   * 分析用户需求并提出创意概念
   * @param {string} userRequest - 用户需求
   * @param {Object} context - 上下文信息
   * @returns {Promise<string>} 创意分析结果
   */
  async analyzeRequest(userRequest, context = {}) {
    const prompt = `用户需求：${userRequest}

请作为创意总监分析这个需求，提出创意概念和主题方向。
请考虑：
1. 故事的核心创意点
2. 适合的主题和氛围
3. 潜在的创新元素
4. 目标受众和情感共鸣点

${context.additionalInfo ? `额外信息：${context.additionalInfo}` : ''}`;

    return await this.generateResponse(prompt);
  }

  /**
   * 协调团队工作
   * @param {Array} teamInputs - 团队成员的输入
   * @returns {Promise<string>} 协调指导
   */
  async coordinateTeam(teamInputs) {
    const inputSummary = teamInputs.map(input => 
      `${input.role}: ${input.content}`
    ).join('\n');

    const prompt = `团队成员的反馈：
${inputSummary}

作为创意总监，请：
1. 整合各方面的建议
2. 确定最终的创意方向
3. 给出具体的执行指导
4. 确保创意的一致性和完整性`;

    return await this.generateResponse(prompt);
  }
}

// 故事架构师 - 负责故事结构和情节设计
export class StoryArchitect extends BaseAgent {
  constructor(genre = 'general') {
    super('story_architect', genre);
  }

  /**
   * 设计故事结构
   * @param {string} concept - 创意概念
   * @param {Object} requirements - 故事要求
   * @returns {Promise<string>} 故事结构设计
   */
  async designStructure(concept, requirements = {}) {
    const prompt = `创意概念：${concept}

故事要求：
- 长度：${requirements.length || '中等'}
- 风格：${requirements.style || '根据概念确定'}
- 特殊要求：${requirements.special || '无'}

请设计详细的故事结构，包括：
1. 三幕结构的详细安排
2. 主要情节点和转折
3. 节奏控制和张力分布
4. 故事逻辑的连贯性检查`;

    return await this.generateResponse(prompt);
  }

  /**
   * 验证故事逻辑
   * @param {string} storyOutline - 故事大纲
   * @returns {Promise<string>} 逻辑验证结果
   */
  async validateLogic(storyOutline) {
    const prompt = `故事大纲：${storyOutline}

请检查故事的逻辑性：
1. 情节发展是否合理
2. 因果关系是否清晰
3. 时间线是否一致
4. 是否存在逻辑漏洞
5. 提出改进建议`;

    return await this.generateResponse(prompt);
  }
}

// 角色设计师 - 负责角色塑造和发展
export class CharacterDesigner extends BaseAgent {
  constructor(genre = 'general') {
    super('character_designer', genre);
  }

  /**
   * 创造主要角色
   * @param {string} storyContext - 故事背景
   * @param {Object} roleRequirements - 角色要求
   * @returns {Promise<string>} 角色设计
   */
  async createCharacters(storyContext, roleRequirements = {}) {
    const prompt = `故事背景：${storyContext}

角色要求：
- 主角类型：${roleRequirements.protagonistType || '待定'}
- 角色数量：${roleRequirements.characterCount || '根据故事需要'}
- 特殊要求：${roleRequirements.special || '无'}

请设计主要角色，包括：
1. 角色的基本信息（姓名、年龄、职业等）
2. 性格特征和心理特点
3. 背景故事和成长经历
4. 角色在故事中的作用和发展弧线
5. 角色间的关系网络`;

    return await this.generateResponse(prompt);
  }

  /**
   * 深化角色发展
   * @param {string} characters - 现有角色
   * @param {string} plotPoints - 情节要点
   * @returns {Promise<string>} 角色发展方案
   */
  async developCharacters(characters, plotPoints) {
    const prompt = `现有角色：${characters}

故事情节要点：${plotPoints}

请深化角色发展：
1. 角色的内心冲突和动机
2. 角色成长和变化的轨迹
3. 角色与情节的互动关系
4. 角色的独特行为模式和台词风格`;

    return await this.generateResponse(prompt);
  }
}

// 前台接待 - 与用户直接交互的角色
export class FrontDesk extends BaseAgent {
  constructor(genre = 'general') {
    super('front_desk', genre);
  }

  /**
   * 欢迎用户并收集需求
   * @param {string} userMessage - 用户消息
   * @returns {Promise<string>} 接待回应
   */
  async welcomeUser(userMessage) {
    const prompt = `用户说：${userMessage}

请作为友好的前台接待回应用户：
1. 热情欢迎用户
2. 理解用户的故事需求
3. 询问必要的细节信息
4. 解释我们的服务流程
5. 让用户感到舒适和期待`;

    return await this.generateResponse(prompt);
  }

  /**
   * 向用户报告进展
   * @param {string} progressUpdate - 进展更新
   * @param {string} teamDiscussion - 团队讨论摘要
   * @returns {Promise<string>} 进展报告
   */
  async reportProgress(progressUpdate, teamDiscussion) {
    const prompt = `工作进展：${progressUpdate}

团队讨论摘要：${teamDiscussion}

请向用户报告当前进展：
1. 用通俗易懂的语言解释进展
2. 突出重要的创作要点
3. 让用户了解团队的专业性
4. 保持用户的兴趣和期待
5. 询问用户是否有新的想法或建议`;

    return await this.generateResponse(prompt);
  }

  /**
   * 展示最终成果
   * @param {string} finalStory - 最终故事
   * @param {Object} creationSummary - 创作总结
   * @returns {Promise<string>} 成果展示
   */
  async presentFinalStory(finalStory, creationSummary) {
    const prompt = `最终故事：${finalStory}

创作总结：${JSON.stringify(creationSummary, null, 2)}

请向用户展示最终成果：
1. 以令人兴奋的方式介绍故事
2. 突出故事的亮点和特色
3. 简要介绍创作过程中的精彩瞬间
4. 感谢用户的参与和信任
5. 询问用户的感受和反馈`;

    return await this.generateResponse(prompt);
  }

  /**
   * 处理用户中途建议
   * @param {string} userSuggestion - 用户建议
   * @param {string} currentContext - 当前创作上下文
   * @returns {Promise<string>} 建议处理回应
   */
  async handleUserSuggestion(userSuggestion, currentContext) {
    const prompt = `用户建议：${userSuggestion}

当前创作状态：${currentContext}

请回应用户的建议：
1. 感谢用户的参与和建议
2. 评估建议的可行性
3. 解释如何将建议融入创作
4. 向团队传达用户的想法
5. 让用户感到被重视和参与其中`;

    return await this.generateResponse(prompt);
  }
}

// 编辑反思者 - 负责质疑和完善团队创意
export class CreativeEditor extends BaseAgent {
  constructor(genre = 'general') {
    super('creative_editor', genre);
  }

  /**
   * 质疑Blake的结构方案
   * @param {string} userRequirements - 用户需求
   * @param {string} blakeProposal - Blake的方案
   * @returns {Promise<string>} 质疑和建议
   */
  async critiqueStructureProposal(userRequirements, blakeProposal) {
    const prompt = `用户需求：${userRequirements}

Blake的结构方案：${blakeProposal}

请从以下角度进行建设性质疑：
1. 结构逻辑是否合理？
2. 是否符合用户需求？
3. 读者接受度如何？
4. 执行难度评估
5. 具体改进建议

记住：要建设性地质疑，既指出问题也提供解决方案。`;

    return await this.generateResponse(prompt);
  }

  /**
   * 质疑Charlie的角色方案
   * @param {string} userRequirements - 用户需求
   * @param {string} charlieProposal - Charlie的方案
   * @returns {Promise<string>} 质疑和建议
   */
  async critiqueCharacterProposal(userRequirements, charlieProposal) {
    const prompt = `用户需求：${userRequirements}

Charlie的角色方案：${charlieProposal}

请从以下角度进行建设性质疑：
1. 角色设定是否可信？
2. 是否与目标读者产生共鸣？
3. 角色关系是否合理？
4. 市场吸引力如何？
5. 具体改进建议

记住：要帮助Charlie完善角色设计，而不是否定创意。`;

    return await this.generateResponse(prompt);
  }

  /**
   * 综合方案质疑
   * @param {string} userRequirements - 用户需求
   * @param {Array} teamProposals - 团队方案
   * @returns {Promise<string>} 综合分析
   */
  async critiqueOverallProposal(userRequirements, teamProposals) {
    const proposalsSummary = teamProposals.map(proposal => 
      `${proposal.role}: ${proposal.content}`
    ).join('\n');

    const prompt = `用户需求：${userRequirements}

团队提出的方案：
${proposalsSummary}

请进行综合评估：
1. 整体方案的优势和亮点
2. 潜在的问题和风险
3. 市场竞争力分析
4. 用户接受度预测
5. 具体改进建议

为Kairos的最终决策提供参考。`;

    return await this.generateResponse(prompt);
  }

  /**
   * 提供最终建议
   * @param {Object} discussionRecord - 完整讨论记录
   * @param {string} coreRequirements - 核心需求
   * @returns {Promise<string>} 最终建议
   */
  async provideFinalRecommendation(discussionRecord, coreRequirements) {
    const prompt = `完整讨论记录：${JSON.stringify(discussionRecord, null, 2)}

用户核心需求：${coreRequirements}

请提供最终建议：
1. 推荐的方案及理由
2. 不推荐的方案及原因
3. 需要特别注意的风险点
4. 对最终3个初案的建议`;

    return await this.generateResponse(prompt);
  }

  /**
   * 方案优化建议
   * @param {string} selectedProposal - 选定方案
   * @param {Array} identifiedIssues - 已识别问题
   * @returns {Promise<string>} 优化建议
   */
  async provideOptimizationSuggestions(selectedProposal, identifiedIssues) {
    const issuesSummary = identifiedIssues.join('\n');

    const prompt = `选定方案：${selectedProposal}

已识别的问题：
${issuesSummary}

请提供：
1. 具体的优化方案
2. 风险规避策略
3. 执行过程中的注意事项
4. 质量控制建议`;

    return await this.generateResponse(prompt);
  }
}
