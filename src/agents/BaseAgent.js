import { GoogleGenerativeAI } from '@google/generative-ai';
import configManager from '../config/ConfigManager.js';
import dotenv from 'dotenv';

dotenv.config();

class BaseAgent {
  constructor(roleId, genre = 'general') {
    // 从配置管理器获取角色配置
    this.roleConfig = configManager.getRoleConfig(roleId);
    if (!this.roleConfig) {
      throw new Error(`未找到角色配置: ${roleId}`);
    }
    
    this.roleId = roleId;
    this.name = this.roleConfig.name;
    this.displayName = this.roleConfig.displayName;
    this.emoji = this.roleConfig.emoji;
    this.role = roleId; // 保持兼容性
    this.genre = genre;
    
    // 获取调整后的prompt和模型配置
    this.systemPrompt = configManager.getAdjustedRolePrompt(roleId, genre);
    this.modelConfig = configManager.getAdjustedModelConfig(roleId, genre);
    
    // 初始化 Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelConfig.modelName || "gemini-pro",
      generationConfig: {
        temperature: this.modelConfig.temperature || 0.7,
        topP: this.modelConfig.topP || 0.8,
        topK: this.modelConfig.topK || 40,
        maxOutputTokens: this.modelConfig.maxTokens || 2048,
      }
    });
    
    this.conversationHistory = [];
  }

  async generateResponse(prompt, context = []) {
    try {
      // 构建完整的上下文
      const fullContext = [
        { role: 'system', content: this.systemPrompt },
        ...context,
        { role: 'user', content: prompt }
      ];

      // 将对话历史转换为Gemini格式
      const chat = this.model.startChat({
        history: this.conversationHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      });

      const result = await chat.sendMessage(prompt);
      const response = result.response.text();

      // 更新对话历史
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: response }
      );

      return response;
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      return `[${this.name} 遇到错误: ${error.message}]`;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getRole() {
    return this.role;
  }

  getName() {
    return this.name;
  }

  getDisplayName() {
    return this.displayName;
  }

  getEmoji() {
    return this.emoji;
  }

  getRoleId() {
    return this.roleId;
  }

  getGenre() {
    return this.genre;
  }

  getCommunicationStyle() {
    return this.roleConfig.communicationStyle;
  }

  /**
   * 更新故事类型，重新调整prompt和模型配置
   * @param {string} newGenre - 新的故事类型
   */
  updateGenre(newGenre) {
    this.genre = newGenre;
    this.systemPrompt = configManager.getAdjustedRolePrompt(this.roleId, newGenre);
    this.modelConfig = configManager.getAdjustedModelConfig(this.roleId, newGenre);
    
    // 重新创建模型实例以应用新配置
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelConfig.modelName || "gemini-pro",
      generationConfig: {
        temperature: this.modelConfig.temperature || 0.7,
        topP: this.modelConfig.topP || 0.8,
        topK: this.modelConfig.topK || 40,
        maxOutputTokens: this.modelConfig.maxTokens || 2048,
      }
    });
  }

  /**
   * 获取角色的简介信息
   * @returns {Object} 角色简介
   */
  getProfile() {
    return {
      roleId: this.roleId,
      name: this.name,
      displayName: this.displayName,
      emoji: this.emoji,
      genre: this.genre,
      communicationStyle: this.roleConfig.communicationStyle,
      modelConfig: this.modelConfig
    };
  }
}

export default BaseAgent;
