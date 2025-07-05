// 角色配置索引 - 统一管理所有AI角色配置
import AriaConfig from './AriaConfig.js';

// 角色配置映射
export const RoleConfigMap = {
  front_desk: AriaConfig,
  // 其他角色配置可以在这里添加
  // creative_director: AlexConfig,
  // story_architect: BlakeConfig,
  // character_designer: CharlieConfig,
  // dialogue_expert: DanaConfig,
};

// 获取角色配置的辅助函数
export const getRoleConfig = (roleId) => {
  const config = RoleConfigMap[roleId];
  if (!config) {
    throw new Error(`角色配置未找到: ${roleId}`);
  }
  return config;
};

// 获取所有可用角色
export const getAvailableRoles = () => {
  return Object.keys(RoleConfigMap).filter(roleId => {
    const config = RoleConfigMap[roleId];
    return config && config.enabled !== false;
  });
};

// 验证角色配置
export const validateRoleConfig = (config) => {
  const requiredFields = ['roleId', 'name', 'displayName', 'model', 'systemPrompt'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`角色配置缺少必需字段: ${field}`);
    }
  }
  
  // 验证模型配置
  const requiredModelFields = ['provider', 'modelName', 'temperature'];
  for (const field of requiredModelFields) {
    if (config.model[field] === undefined) {
      throw new Error(`模型配置缺少必需字段: ${field}`);
    }
  }
  
  return true;
};

// 获取角色的模型配置
export const getRoleModelConfig = (roleId) => {
  const config = getRoleConfig(roleId);
  return config.model;
};

// 获取角色的系统提示词
export const getRoleSystemPrompt = (roleId) => {
  const config = getRoleConfig(roleId);
  return config.systemPrompt;
};

// 获取角色的显示信息
export const getRoleDisplayInfo = (roleId) => {
  const config = getRoleConfig(roleId);
  return {
    name: config.name,
    displayName: config.displayName,
    emoji: config.emoji,
    description: config.description
  };
};

export default {
  RoleConfigMap,
  getRoleConfig,
  getAvailableRoles,
  validateRoleConfig,
  getRoleModelConfig,
  getRoleSystemPrompt,
  getRoleDisplayInfo
};
