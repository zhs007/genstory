import { GoogleGenerativeAI } from '@google/generative-ai';
import configManager from '../config/ConfigManager.js';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import nodeFetch from 'node-fetch';

dotenv.config();

// 代理配置
const configureProxy = () => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  if (proxy) {
    console.log(`🌐 检测到代理配置: ${proxy}`);
    
    // 根据代理类型创建相应的 agent
    let agent;
    if (proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
      agent = new SocksProxyAgent(proxy);
      console.log(`🧦 使用 SOCKS 代理`);
    } else {
      agent = new HttpsProxyAgent(proxy);
      console.log(`🌐 使用 HTTP(S) 代理`);
    }
    
    // 使用 node-fetch 替换全局 fetch（更可靠的代理支持）
    if (!globalThis.fetch.isProxied) {
      globalThis.fetch = async (url, options = {}) => {
        if (typeof url === 'string' && (url.includes('googleapis.com') || url.includes('google.com'))) {
          options.agent = agent;
          options.timeout = 30000;
          console.log(`🔗 通过代理访问: ${new URL(url).hostname}`);
        }
        return nodeFetch(url, options);
      };
      globalThis.fetch.isProxied = true;
      console.log(`🔧 已配置 node-fetch 代理支持`);
    }
    
    return true;
  } else {
    console.log(`🌐 未检测到代理配置，使用直连`);
  }
  return false;
};

class BaseAgent {
  constructor(roleId, genre = 'general') {
    // 配置代理（只配置一次）
    if (!BaseAgent.proxyConfigured) {
      BaseAgent.proxyConfigured = configureProxy();
    }
    
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
    
    // 初始化 Gemini API，使用代理配置
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    // 创建自定义的 RequestInit 配置
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
    let customRequestInit = {};
    
    if (proxy) {
      let agent;
      if (proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
        agent = new SocksProxyAgent(proxy);
        console.log(`🧦 ${this.name} 使用 SOCKS 代理: ${proxy}`);
      } else {
        agent = new HttpsProxyAgent(proxy);
        console.log(`🌐 ${this.name} 使用 HTTP(S) 代理: ${proxy}`);
      }
      customRequestInit.agent = agent;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey, { 
      baseUrl: 'https://generativelanguage.googleapis.com',
      // 注意：Google AI SDK 可能不直接支持代理配置
      // 我们需要在全局级别设置
    });
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelConfig.modelName || "gemini-2.5-pro",
      generationConfig: {
        temperature: this.modelConfig.temperature || 0.7,
        topP: this.modelConfig.topP || 0.8,
        topK: this.modelConfig.topK || 40,
        maxOutputTokens: this.modelConfig.maxTokens || 2048,
      }
    });
    
    this.conversationHistory = [];
    
    // 添加初始化日志
    console.log(`🎭 初始化角色: ${this.name} (${this.roleId})`);
    console.log(`   显示名称: ${this.displayName}`);
    console.log(`   模型配置: ${this.modelConfig.modelName}`);
    console.log(`   故事类型: ${this.genre}`);
    console.log(`   参数设置: temp=${this.modelConfig.temperature}, maxTokens=${this.modelConfig.maxTokens}`);
  }

  async generateResponse(prompt, context = [], retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    try {
      // 检查API密钥
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY 环境变量未正确设置。请在 .env 文件中设置有效的 Google Gemini API 密钥。');
      }

      // 添加请求日志 - 显示角色名和模型信息
      console.log(`🤖 [${this.name}] 正在请求 Gemini API`);
      console.log(`   角色ID: ${this.roleId}`);
      console.log(`   模型名: ${this.modelConfig.modelName}`);
      console.log(`   模型配置: temperature=${this.modelConfig.temperature}, maxTokens=${this.modelConfig.maxTokens}`);
      if (retryCount > 0) {
        console.log(`   重试次数: ${retryCount}/${maxRetries}`);
      }

      // 构建完整的上下文，将系统提示词加入对话历史
      const systemPromptHistory = [
        { role: 'user', parts: [{ text: this.systemPrompt }] },
        { role: 'model', parts: [{ text: '我明白了，我会严格按照您的要求进行工作。' }] }
      ];

      const fullHistory = [
        ...systemPromptHistory,
        ...this.conversationHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      ];

      // 将对话历史转换为Gemini格式
      const chat = this.model.startChat({
        history: fullHistory
      });

      const result = await chat.sendMessage(prompt);
      const response = result.response.text();

      // 添加响应成功日志
      console.log(`✅ [${this.name}] API 请求成功，响应长度: ${response.length} 字符`);

      // 更新对话历史
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: response }
      );

      return {
        success: true,
        content: response,
        error: null
      };
    } catch (error) {
      // 添加错误日志 - 显示角色和模型信息
      console.error(`❌ [${this.name}] API 请求失败 (${this.modelConfig.modelName})`);
      console.error(`   错误信息: ${error.message}`);
      console.error(`   尝试次数: ${retryCount + 1}/${maxRetries + 1}`);
      
      // 网络错误重试机制 - 检查各种网络错误类型
      const networkErrors = [
        'fetch failed',
        'socket hang up',
        'ECONNRESET',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'network timeout',
        'Connection timeout',
        'Request timeout'
      ];
      
      const isNetworkError = networkErrors.some(errorType => 
        error.message.toLowerCase().includes(errorType.toLowerCase())
      );
      
      if (isNetworkError && retryCount < maxRetries) {
        console.log(`🔄 [${this.name}] 检测到网络错误，正在重试... (${retryCount + 1}/${maxRetries})`);
        console.log(`   错误类型: ${error.message.substring(0, 100)}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return this.generateResponse(prompt, context, retryCount + 1);
      }
      
      // 构造统一的错误返回格式
      let errorMessage = '';
      let errorType = 'unknown';
      
      // 如果是API密钥问题
      if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
        errorType = 'api_key';
        errorMessage = `配置错误: ${error.message}`;
      }
      // 网络连接问题 - 扩展网络错误类型识别
      else if (networkErrors.some(errType => error.message.toLowerCase().includes(errType.toLowerCase()))) {
        errorType = 'network';
        const proxyHint = process.env.HTTPS_PROXY || process.env.HTTP_PROXY ? 
          `当前使用代理: ${process.env.HTTPS_PROXY || process.env.HTTP_PROXY}. ` : 
          '如果您在使用代理，请在 .env 文件中设置 HTTPS_PROXY 或 HTTP_PROXY 环境变量. ';
        errorMessage = `网络连接失败: ${proxyHint}已达到最大重试次数(${maxRetries})，请检查网络连接、代理设置或稍后重试。错误详情: ${error.message}`;
      }
      // 其他错误
      else {
        errorType = 'general';
        errorMessage = `遇到错误: ${error.message}`;
      }
      
      return {
        success: false,
        content: null,
        error: {
          type: errorType,
          message: errorMessage,
          agent: this.name,
          timestamp: new Date().toISOString()
        }
      };
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
    const oldGenre = this.genre;
    this.genre = newGenre;
    this.systemPrompt = configManager.getAdjustedRolePrompt(this.roleId, newGenre);
    this.modelConfig = configManager.getAdjustedModelConfig(this.roleId, newGenre);
    
    // 重新创建模型实例以应用新配置
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelConfig.modelName || "gemini-2.5-pro",
      generationConfig: {
        temperature: this.modelConfig.temperature || 0.7,
        topP: this.modelConfig.topP || 0.8,
        topK: this.modelConfig.topK || 40,
        maxOutputTokens: this.modelConfig.maxTokens || 2048,
      }
    });
    
    // 添加类型更新日志
    console.log(`🔄 [${this.name}] 故事类型更新: ${oldGenre} → ${newGenre}`);
    console.log(`   新模型配置: ${this.modelConfig.modelName}, temp=${this.modelConfig.temperature}`);
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

// 静态属性来跟踪代理配置状态
BaseAgent.proxyConfigured = false;

export default BaseAgent;
