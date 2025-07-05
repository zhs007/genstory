// 配置管理器 - 负责加载和管理系统配置
import { SystemConfig, RoleConfigs, GenreConfigurations } from './SystemConfig.js';
import { getRoleConfig, getAvailableRoles, validateRoleConfig } from './roles/index.js';

class ConfigManager {
  constructor() {
    this.systemConfig = SystemConfig;
    this.roleConfigs = RoleConfigs;
    this.genreConfigs = GenreConfigurations;
    this.loadEnvironmentOverrides();
  }

  /**
   * 加载环境变量覆盖配置
   */
  loadEnvironmentOverrides() {
    // 允许通过环境变量覆盖某些配置
    if (process.env.PORT) {
      this.systemConfig.server.port = parseInt(process.env.PORT);
    }
    
    if (process.env.LOG_LEVEL) {
      this.systemConfig.logging.level = process.env.LOG_LEVEL;
    }
    
    if (process.env.MAX_DISCUSSION_ROUNDS) {
      this.systemConfig.orchestrator.maxDiscussionRounds = parseInt(process.env.MAX_DISCUSSION_ROUNDS);
    }
  }

  /**
   * 获取系统配置
   */
  getSystemConfig() {
    return this.systemConfig;
  }

  /**
   * 获取所有角色配置
   */
  getRoleConfigs() {
    return this.roleConfigs;
  }

  /**
   * 获取特定角色的配置
   * @param {string} roleId - 角色ID
   * @returns {Object|null} 角色配置
   */
  getRoleConfig(roleId) {
    return this.roleConfigs[roleId] || null;
  }

  /**
   * 获取启用的角色列表
   * @returns {Array} 启用的角色ID列表
   */
  getEnabledRoles() {
    return Object.keys(this.roleConfigs).filter(roleId => 
      this.roleConfigs[roleId].enabled
    );
  }

  /**
   * 获取故事类型配置
   * @param {string} genre - 故事类型
   * @returns {Object|null} 类型配置
   */
  getGenreConfig(genre) {
    return this.genreConfigs[genre] || this.genreConfigs['general'];
  }

  /**
   * 获取支持的故事类型列表
   * @returns {Array} 支持的故事类型
   */
  getSupportedGenres() {
    return this.systemConfig.story.supportedGenres;
  }

  /**
   * 根据故事类型调整角色的prompt
   * @param {string} roleId - 角色ID
   * @param {string} genre - 故事类型
   * @returns {string} 调整后的系统prompt
   */
  getAdjustedRolePrompt(roleId, genre = 'general') {
    const roleConfig = this.getRoleConfig(roleId);
    if (!roleConfig) return '';

    const genreConfig = this.getGenreConfig(genre);
    let prompt = roleConfig.systemPrompt;

    // 如果有针对该类型的特殊修饰符，添加到prompt中
    if (genreConfig.promptModifiers && genreConfig.promptModifiers[roleId]) {
      prompt += `\n\n特别注意：${genreConfig.promptModifiers[roleId]}`;
    }

    return prompt;
  }

  /**
   * 根据故事类型调整模型参数
   * @param {string} roleId - 角色ID
   * @param {string} genre - 故事类型
   * @returns {Object} 调整后的模型配置
   */
  getAdjustedModelConfig(roleId, genre = 'general') {
    const roleConfig = this.getRoleConfig(roleId);
    if (!roleConfig) return {};

    const genreConfig = this.getGenreConfig(genre);
    const modelConfig = { ...roleConfig.model };

    // 根据故事类型调整temperature等参数
    if (genreConfig.toneAdjustments) {
      const baseTemp = modelConfig.temperature;
      const creativityFactor = genreConfig.toneAdjustments.creativity || 1.0;
      
      // 调整temperature，但保持在合理范围内
      modelConfig.temperature = Math.min(1.0, Math.max(0.1, baseTemp * creativityFactor));
    }

    return modelConfig;
  }

  /**
   * 验证配置的完整性
   * @returns {Object} 验证结果
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // 检查必需的角色是否存在
    const requiredRoles = ['creative_director', 'story_architect', 'character_designer', 'dialogue_expert', 'front_desk'];
    for (const roleId of requiredRoles) {
      if (!this.roleConfigs[roleId]) {
        errors.push(`缺少必需的角色配置: ${roleId}`);
      } else if (!this.roleConfigs[roleId].enabled) {
        warnings.push(`角色 ${roleId} 已被禁用`);
      }
    }

    // 检查系统配置的合理性
    if (this.systemConfig.orchestrator.maxDiscussionRounds < 1) {
      errors.push('最大讨论轮次必须大于0');
    }

    if (this.systemConfig.story.maxLength <= this.systemConfig.story.minLength) {
      errors.push('故事最大长度必须大于最小长度');
    }

    // 检查每个角色的模型配置
    for (const [roleId, config] of Object.entries(this.roleConfigs)) {
      if (!config.model || !config.model.provider) {
        errors.push(`角色 ${roleId} 缺少模型配置`);
      }
      
      if (!config.systemPrompt) {
        errors.push(`角色 ${roleId} 缺少系统prompt`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 动态更新角色配置（运行时）
   * @param {string} roleId - 角色ID
   * @param {Object} updates - 更新的配置
   */
  updateRoleConfig(roleId, updates) {
    if (this.roleConfigs[roleId]) {
      this.roleConfigs[roleId] = { ...this.roleConfigs[roleId], ...updates };
    }
  }

  /**
   * 启用或禁用角色
   * @param {string} roleId - 角色ID
   * @param {boolean} enabled - 是否启用
   */
  toggleRole(roleId, enabled) {
    if (this.roleConfigs[roleId]) {
      this.roleConfigs[roleId].enabled = enabled;
    }
  }

  /**
   * 获取配置摘要（用于调试）
   * @returns {Object} 配置摘要
   */
  getConfigSummary() {
    const enabledRoles = this.getEnabledRoles();
    const validation = this.validateConfig();
    
    return {
      systemConfig: {
        port: this.systemConfig.server.port,
        maxDiscussionRounds: this.systemConfig.orchestrator.maxDiscussionRounds,
        supportedGenres: this.systemConfig.story.supportedGenres.length,
        logLevel: this.systemConfig.logging.level
      },
      roles: {
        total: Object.keys(this.roleConfigs).length,
        enabled: enabledRoles.length,
        disabled: Object.keys(this.roleConfigs).length - enabledRoles.length,
        list: enabledRoles
      },
      genres: {
        total: Object.keys(this.genreConfigs).length,
        list: Object.keys(this.genreConfigs)
      },
      validation
    };
  }

  /**
   * 从专门配置文件获取角色配置（优先级高于默认配置）
   * @param {string} roleId - 角色ID
   * @returns {Object|null} 角色配置对象
   */
  getDetailedRoleConfig(roleId) {
    try {
      // 尝试从专门配置文件获取
      const detailedConfig = getRoleConfig(roleId);
      if (detailedConfig) {
        validateRoleConfig(detailedConfig);
        return detailedConfig;
      }
    } catch (error) {
      console.warn(`无法加载角色 ${roleId} 的详细配置，使用默认配置:`, error.message);
    }
    
    // 回退到默认配置
    return this.getRoleConfig(roleId);
  }

  /**
   * 获取所有可用的角色列表
   * @returns {Array} 可用角色ID列表
   */
  getAvailableRoles() {
    try {
      // 优先使用详细配置中的可用角色
      const detailedRoles = getAvailableRoles();
      if (detailedRoles.length > 0) {
        return detailedRoles;
      }
    } catch (error) {
      console.warn('无法获取详细角色配置，使用默认配置:', error.message);
    }
    
    // 回退到默认配置
    return Object.keys(this.roleConfigs).filter(roleId => {
      const config = this.roleConfigs[roleId];
      return config && config.enabled !== false;
    });
  }

  /**
   * 获取角色的完整模型配置
   * @param {string} roleId - 角色ID
   * @returns {Object} 模型配置对象
   */
  getRoleModelConfig(roleId) {
    const config = this.getDetailedRoleConfig(roleId);
    if (!config || !config.model) {
      throw new Error(`角色 ${roleId} 的模型配置不存在`);
    }
    
    return {
      ...config.model,
      // 确保有默认值
      temperature: config.model.temperature ?? 0.7,
      maxTokens: config.model.maxTokens ?? 2048,
      topP: config.model.topP ?? 0.9,
      topK: config.model.topK ?? 40
    };
  }

  /**
   * 获取角色的系统提示词
   * @param {string} roleId - 角色ID
   * @param {string} genre - 故事类型（可选）
   * @returns {string} 系统提示词
   */
  getRoleSystemPrompt(roleId, genre = null) {
    const config = this.getDetailedRoleConfig(roleId);
    if (!config) {
      throw new Error(`角色 ${roleId} 的配置不存在`);
    }
    
    let prompt = config.systemPrompt;
    
    // 如果指定了故事类型，应用类型特定的修饰符
    if (genre) {
      const genreConfig = this.getGenreConfig(genre);
      if (genreConfig.promptModifiers && genreConfig.promptModifiers[roleId]) {
        prompt += `\n\n【${genre}类型特别要求】\n${genreConfig.promptModifiers[roleId]}`;
      }
    }
    
    return prompt;
  }

  /**
   * 获取角色的显示信息
   * @param {string} roleId - 角色ID
   * @returns {Object} 显示信息对象
   */
  getRoleDisplayInfo(roleId) {
    const config = this.getDetailedRoleConfig(roleId);
    if (!config) {
      return null;
    }
    
    return {
      name: config.name,
      displayName: config.displayName,
      emoji: config.emoji,
      description: config.description || config.brief || '暂无描述'
    };
  }
}

// 创建单例实例
const configManager = new ConfigManager();

export default configManager;
