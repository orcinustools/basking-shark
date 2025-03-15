const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 50539;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Data directory paths
const DATA_DIR = path.join(__dirname, 'data');
const LLM_CONFIG_PATH = path.join(DATA_DIR, 'llm_config.json');
const SERVERS_PATH = path.join(DATA_DIR, 'servers.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load LLM configuration
let llmConfig = { models: [], default_model: 'openai', api_keys: { openai: '', anthropic: '' } };
if (fs.existsSync(LLM_CONFIG_PATH)) {
  try {
    llmConfig = JSON.parse(fs.readFileSync(LLM_CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error('Error loading LLM config:', error);
  }
}

// Use API keys from .env if available
if (process.env.OPENAI_API_KEY) {
  llmConfig.api_keys.openai = process.env.OPENAI_API_KEY;
}
if (process.env.ANTHROPIC_API_KEY) {
  llmConfig.api_keys.anthropic = process.env.ANTHROPIC_API_KEY;
}

// Load server connections
let serverConnections = {};
if (fs.existsSync(SERVERS_PATH)) {
  try {
    const serversData = JSON.parse(fs.readFileSync(SERVERS_PATH, 'utf8'));
    serverConnections = serversData.servers.reduce((acc, server) => {
      acc[server.name] = server;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error loading servers:', error);
  }
}

// Save server connections to file
const saveServers = () => {
  const serversData = {
    servers: Object.values(serverConnections)
  };
  fs.writeFileSync(SERVERS_PATH, JSON.stringify(serversData, null, 2));
};

// API endpoints for server management
app.put('/api/servers/:name', (req, res) => {
  const { name } = req.params;
  const serverData = req.body;

  console.log('Updating server:', name, 'with data:', {
    ...serverData,
    password: serverData.password ? '[REDACTED]' : undefined,
    privateKey: serverData.privateKey ? '[REDACTED]' : undefined
  });

  // Check if server exists
  if (!serverConnections[name]) {
    console.error('Server not found:', name);
    return res.status(404).json({ error: 'Server not found' });
  }

  const currentServer = serverConnections[name];

  // Create updated server object with defaults from current server
  const updatedServer = {
    name: name,
    host: serverData.host || currentServer.host,
    port: parseInt(serverData.port || currentServer.port) || 22,
    username: serverData.username || currentServer.username,
    authType: serverData.authType || currentServer.authType,
    // Keep existing auth credentials if not provided
    password: currentServer.password,
    privateKey: currentServer.privateKey
  };

  // Validate required fields
  if (!updatedServer.host || !updatedServer.username || !updatedServer.authType) {
    console.error('Missing required fields for server:', name);
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: {
        host: !updatedServer.host ? 'Host is required' : null,
        username: !updatedServer.username ? 'Username is required' : null,
        authType: !updatedServer.authType ? 'Authentication type is required' : null
      }
    });
  }

  // Validate port
  if (isNaN(updatedServer.port) || updatedServer.port < 1 || updatedServer.port > 65535) {
    console.error('Invalid port number for server:', name, 'port:', updatedServer.port);
    return res.status(400).json({ error: 'Port must be a number between 1 and 65535' });
  }

  // Update auth credentials if provided
  if (updatedServer.authType === 'password') {
    if (serverData.password) {
      updatedServer.password = serverData.password;
      delete updatedServer.privateKey; // Remove private key when switching to password
    } else if (!currentServer.password) {
      console.error('Password required for server:', name);
      return res.status(400).json({ error: 'Password is required for password authentication' });
    }
  } else if (updatedServer.authType === 'privateKey') {
    if (serverData.privateKey) {
      updatedServer.privateKey = serverData.privateKey;
      delete updatedServer.password; // Remove password when switching to private key
    } else if (!currentServer.privateKey) {
      console.error('Private key required for server:', name);
      return res.status(400).json({ error: 'Private key is required for key authentication' });
    }
  }

  // Save updated server
  serverConnections[name] = updatedServer;
  saveServers();

  console.log('Server updated successfully:', name);
  res.json({ 
    message: 'Server updated successfully',
    server: {
      ...updatedServer,
      password: updatedServer.password ? '[REDACTED]' : undefined,
      privateKey: updatedServer.privateKey ? '[REDACTED]' : undefined
    }
  });
});

app.delete('/api/servers/:name', (req, res) => {
  const { name } = req.params;

  // Check if server exists
  if (!serverConnections[name]) {
    return res.status(404).json({ error: 'Server not found' });
  }

  // Delete server
  delete serverConnections[name];
  saveServers();

  res.json({ message: 'Server deleted successfully' });
});

// Initialize AI clients
const openai = new OpenAI({
  apiKey: llmConfig.api_keys.openai || 'your-openai-api-key'
});

const anthropic = new Anthropic({
  apiKey: llmConfig.api_keys.anthropic || 'your-anthropic-api-key'
});

// Qwen API is handled through OpenAI client with a different base URL
// We'll implement this in the DevOpsAgent class when needed

// Store chat histories for each connection
const chatHistories = new Map();

// AI Agent with Chain of Thought
class DevOpsAgent {
  constructor(model = null, socketId = null) {
    // Use provided model, active model, or default model
    this.model = model || llmConfig.active_model || llmConfig.default_model;
    this.thinking = [];
    this.actions = [];
    this.results = [];
    this.socketId = socketId;
    
    // Initialize chat history for this connection if it doesn't exist
    if (socketId && !chatHistories.has(socketId)) {
      chatHistories.set(socketId, []);
    }
  }

  getChatHistory() {
    if (!this.socketId) return [];
    return chatHistories.get(this.socketId) || [];
  }

  addToHistory(interaction) {
    if (!this.socketId) return;
    const history = this.getChatHistory();
    history.push(interaction);
    chatHistories.set(this.socketId, history);
  }

  getContextFromHistory() {
    const history = this.getChatHistory();
    if (history.length === 0) return "";

    // Create a context string from the last 5 interactions
    return history.slice(-5).map(interaction => {
      return `User: ${interaction.instruction}
AI Thought Process: ${interaction.thinking.join("\n")}
Commands Executed: ${interaction.actions.map(a => a.command).join(", ")}
Results: ${interaction.results.map(r => r.output).join("\n")}
Analysis: ${interaction.analysis || ""}
---`;
    }).join("\n");
  }

  async processInstruction(instruction, serverName, socket) {
    try {
      // Reset agent state
      this.thinking = [];
      this.actions = [];
      this.results = [];
      
      // Step 1: Understand the instruction with Chain of Thought
      socket.emit('agent-update', { 
        type: 'thinking',
        message: 'Analyzing your instruction...'
      });

      // Create current interaction object
      const currentInteraction = {
        instruction,
        timestamp: new Date().toISOString(),
        thinking: [],
        actions: [],
        results: []
      };
      
      const planningResult = await this.planWithCoT(instruction, serverName);
      this.thinking = planningResult.thinking;
      this.actions = planningResult.actions;
      
      // Update current interaction
      currentInteraction.thinking = this.thinking;
      currentInteraction.actions = this.actions;
      
      socket.emit('agent-update', { 
        type: 'thinking-complete',
        thinking: this.thinking
      });
      
      // Step 2: Execute each action
      for (let i = 0; i < this.actions.length; i++) {
        const action = this.actions[i];
        
        socket.emit('agent-update', { 
          type: 'executing',
          message: `Executing: ${action.command}`,
          index: i
        });
        
        const result = await this.executeCommand(serverName, action.command);
        this.results.push({
          command: action.command,
          output: result.output,
          error: result.errorOutput,
          exitCode: result.exitCode
        });
        
        socket.emit('agent-update', { 
          type: 'execution-result',
          result: {
            command: action.command,
            output: result.output,
            error: result.errorOutput,
            exitCode: result.exitCode
          },
          index: i
        });
      }
      
      // Step 3: Analyze results
      socket.emit('agent-update', { 
        type: 'analyzing',
        message: 'Analyzing results...'
      });
      
      const analysis = await this.analyzeResults(instruction);
      
      // Update current interaction with final results
      currentInteraction.results = this.results;
      currentInteraction.analysis = analysis;
      
      // Add to history
      this.addToHistory(currentInteraction);
      
      socket.emit('agent-update', { 
        type: 'complete',
        analysis: analysis,
        history: this.getChatHistory()
      });
      
      return {
        thinking: this.thinking,
        actions: this.actions,
        results: this.results,
        analysis: analysis,
        history: this.getChatHistory()
      };
    } catch (error) {
      socket.emit('agent-update', { 
        type: 'error',
        message: error.message
      });
      
      return {
        error: error.message
      };
    }
  }
  
  async planWithCoT(instruction, serverName) {
    let thinking = [];
    let actions = [];
    
    try {
      let response;
      const modelConfig = llmConfig.models.find(m => m.id === this.model) || 
                          llmConfig.models.find(m => m.id === llmConfig.default_model) ||
                          { provider: 'openai', model: 'gpt-4', temperature: 0.2, max_tokens: 2000 };
      
      // System prompt for all models
      const systemPrompt = `You are a DevOps AI agent that helps manage servers. You need to:
1. Understand the user's instruction
2. Break down the task into a series of steps using Chain of Thought reasoning
3. For each step, determine the exact command to run on the server
4. Explain why each command is necessary

Your output must be in this JSON format:
{
  "thinking": [
    "Step 1: First, I need to...",
    "Step 2: Next, I should...",
    ...
  ],
  "actions": [
    {
      "command": "actual linux command to run",
      "purpose": "explanation of what this command does and why it's needed"
    },
    ...
  ]
}

IMPORTANT RULES:
1. Be precise with your commands. Use standard Linux/Unix commands that would work on most distributions.
2. Do NOT include any ssh or connection commands - the user is already connected to the server.
3. Do NOT use the server name in your commands - use only local commands that would work on the server.
4. Don't use placeholder values - if you need to make assumptions, state them in your thinking.`;

      // Get server details
      const serverConfig = serverConnections[serverName];
      if (!serverConfig) {
        throw new Error(`Server ${serverName} not found`);
      }

      // User prompt for all models
      const userPrompt = `I need you to help me with the following task on my server (${serverConfig.username}@${serverConfig.host}):
              
${instruction}

Please analyze this request, break it down using Chain of Thought reasoning, and determine the exact commands needed. 
Do NOT include any ssh or connection commands in your response - I'm already connected to the server.`;

      if (modelConfig.provider === 'anthropic') {
        response = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: modelConfig.max_tokens || 2000,
          temperature: modelConfig.temperature || 0.2,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt
            }
          ]
        });
        
        const content = response.content[0].text;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
        
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[1]);
          thinking = parsedResponse.thinking || [];
          actions = parsedResponse.actions || [];
        } else {
          throw new Error("Failed to parse AI response");
        }
      } else if (modelConfig.provider === 'qwen') {
        // Create a temporary OpenAI client with Qwen base URL
        const qwenClient = new OpenAI({
          apiKey: llmConfig.api_keys.qwen || 'your-qwen-api-key',
          baseURL: 'https://api.qwen.ai/v1',
        });
        
        response = await qwenClient.chat.completions.create({
          model: modelConfig.model,
          temperature: modelConfig.temperature || 0.2,
          max_tokens: modelConfig.max_tokens,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        });
        
        const parsedResponse = JSON.parse(response.choices[0].message.content);
        thinking = parsedResponse.thinking || [];
        actions = parsedResponse.actions || [];
      } else {
        // Default to OpenAI
        response = await openai.chat.completions.create({
          model: modelConfig.model,
          temperature: modelConfig.temperature || 0.2,
          max_tokens: modelConfig.max_tokens,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        });
        
        const parsedResponse = JSON.parse(response.choices[0].message.content);
        thinking = parsedResponse.thinking || [];
        actions = parsedResponse.actions || [];
      }
      
      // Check for SSH commands
      const originalActionsCount = actions.length;
      actions = actions.filter(action => {
        const cmd = action.command.toLowerCase();
        return !cmd.startsWith('ssh ') && 
               !cmd.includes(' ssh ') && 
               !cmd.includes('@') &&
               !cmd.includes(serverName.toLowerCase());
      });
      
      // If we filtered out any actions, add a warning
      if (actions.length < originalActionsCount) {
        thinking.push("WARNING: Some SSH or connection commands were removed. The AI agent is already connected to the server and should only use local commands.");
      }
      
      return {
        thinking,
        actions
      };
    } catch (error) {
      console.error("Error in planWithCoT:", error);
      throw new Error(`Failed to plan actions: ${error.message}`);
    }
  }
  
  async executeCommand(serverName, command) {
    const serverConfig = serverConnections[serverName];
    if (!serverConfig) {
      throw new Error(`Server ${serverName} not found`);
    }
    
    console.log(`Connecting to server: ${serverName}`);
    console.log(`Server config: ${JSON.stringify({
      host: serverConfig.host,
      port: serverConfig.port,
      username: serverConfig.username,
      authType: serverConfig.authType
    })}`);
    
    const conn = new Client();
    
    try {
      return await new Promise((resolve, reject) => {
        conn.on('ready', () => {
          console.log(`SSH connection established to ${serverConfig.host}`);
          conn.exec(command, (err, stream) => {
            if (err) {
              console.error(`Error executing command: ${err.message}`);
              reject(err);
              return;
            }
            
            console.log(`Executing command: ${command}`);
            let output = '';
            let errorOutput = '';
            
            stream.on('data', (data) => {
              const chunk = data.toString();
              console.log(`Command output: ${chunk}`);
              output += chunk;
            });
            
            stream.stderr.on('data', (data) => {
              const chunk = data.toString();
              console.error(`Command error output: ${chunk}`);
              errorOutput += chunk;
            });
            
            stream.on('close', (code) => {
              console.log(`Command completed with exit code: ${code}`);
              conn.end();
              resolve({ output, errorOutput, exitCode: code });
            });
          });
        }).on('error', (err) => {
          console.error(`SSH connection error: ${err.message}`);
          reject(err);
        }).connect({
          host: serverConfig.host,
          port: serverConfig.port,
          username: serverConfig.username,
          ...(serverConfig.authType === 'password' 
            ? { password: serverConfig.password } 
            : { privateKey: serverConfig.privateKey })
        });
      });
    } catch (error) {
      console.error("Error executing command:", error);
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }
  
  async analyzeResults(instruction) {
    try {
      const context = {
        instruction,
        thinking: this.thinking,
        actions: this.actions.map(a => ({ command: a.command, purpose: a.purpose })),
        results: this.results
      };
      
      let analysis;
      const modelConfig = llmConfig.models.find(m => m.id === this.model) || 
                          llmConfig.models.find(m => m.id === llmConfig.default_model) ||
                          { provider: 'openai', model: 'gpt-4', temperature: 0.3, max_tokens: 1500 };
      
      // System prompt for all models
      const systemPrompt = `You are a DevOps AI assistant that analyzes command results and provides clear, actionable insights.

Your analysis should:
1. Directly answer the user's original question/request
2. Be specific about what was found or accomplished
3. Highlight any important findings or issues
4. Provide clear next steps or recommendations if needed

Format your response using Markdown with this structure:

# Direct Answer
[Clearly state whether the original request was fulfilled]

## Findings
- [Discovery 1]
- [Discovery 2]
...

## Issues (if any)
- [Problem 1]
- [Problem 2]
...

## Next Steps/Recommendations
1. [Action step 1]
2. [Action step 2]
...

Use proper Markdown formatting:
- Use \`code\` for commands and technical terms
- Use **bold** for emphasis
- Use > for important notes
- Use --- for separators where needed
- Use proper heading levels (#, ##, ###)`;
      
      // User prompt for all models
      // Get chat history context
      const historyContext = this.getContextFromHistory();
      
      const userPrompt = `${historyContext ? `Previous Interactions:\n${historyContext}\n\n` : ''}Original Request: "${instruction}"

Commands Executed and Results:
${context.results.map((r, i) => `
Command: ${r.command}
Purpose: ${context.actions[i]?.purpose || 'Not specified'}
Output: ${r.output || 'No output'}
Error: ${r.error || 'No errors'}
Exit Code: ${r.exitCode}
`).join('\n')}

Chain of Thought Analysis:
${context.thinking.join('\n')}

Please provide a comprehensive analysis that:
1. Uses the context from previous interactions if relevant
2. Directly addresses the original request
3. Explains what was found and any changes from previous states
4. Provides actionable insights based on the complete context`;

      if (modelConfig.provider === 'anthropic') {
        const response = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: modelConfig.max_tokens || 1500,
          temperature: modelConfig.temperature || 0.3,
          messages: [
            {
              role: "user",
              content: `${systemPrompt}\n\n${userPrompt}\n\nRemember to format your response according to the structure specified above.`
            }
          ]
        });
        
        analysis = response.content[0].text;
      } else if (modelConfig.provider === 'qwen') {
        // Create a temporary OpenAI client with Qwen base URL
        const qwenClient = new OpenAI({
          apiKey: llmConfig.api_keys.qwen || 'your-qwen-api-key',
          baseURL: 'https://api.qwen.ai/v1',
        });
        
        const response = await qwenClient.chat.completions.create({
          model: modelConfig.model,
          temperature: modelConfig.temperature || 0.3,
          max_tokens: modelConfig.max_tokens || 1500,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt + "\n\nRemember to format your response according to the structure specified above."
            }
          ]
        });
        
        analysis = response.choices[0].message.content;
      } else {
        // Default to OpenAI
        const response = await openai.chat.completions.create({
          model: modelConfig.model,
          temperature: modelConfig.temperature || 0.3,
          max_tokens: modelConfig.max_tokens || 1500,
          response_format: { type: "text" },
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt + "\n\nRemember to format your response according to the structure specified above."
            }
          ]
        });
        
        analysis = response.choices[0].message.content;
      }
      
      return analysis;
    } catch (error) {
      console.error("Error analyzing results:", error);
      return `Error analyzing results: ${error.message}`;
    }
  }
}

// API Routes
app.post('/api/register-server', (req, res) => {
  const { serverName, host, port, username, authType, password, privateKey } = req.body;
  
  if (!serverName || !host || !username || !authType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (authType === 'password' && !password) {
    return res.status(400).json({ error: 'Password is required for password authentication' });
  }
  
  if (authType === 'privateKey' && !privateKey) {
    return res.status(400).json({ error: 'Private key is required for key authentication' });
  }
  
  // Store server credentials
  serverConnections[serverName] = {
    name: serverName,
    host,
    port: port || 22,
    username,
    authType,
    password,
    privateKey,
    createdAt: new Date().toISOString()
  };
  
  // Save to file
  saveServers();
  
  res.json({ success: true, message: `Server ${serverName} registered successfully` });
});

app.get('/api/servers', (req, res) => {
  const serverList = Object.keys(serverConnections).map(name => ({
    name,
    host: serverConnections[name].host,
    username: serverConnections[name].username
  }));
  
  res.json({ servers: serverList });
});

app.get('/api/llm-config', (req, res) => {
  // Return LLM configuration without API keys
  const safeConfig = {
    models: llmConfig.models,
    active_model: llmConfig.active_model || llmConfig.default_model,
    default_model: llmConfig.default_model
  };
  
  res.json(safeConfig);
});

app.post('/api/llm-config', (req, res) => {
  const { api_key, model_id } = req.body;
  
  if (!model_id) {
    return res.status(400).json({ error: 'Model ID is required' });
  }
  
  // Find the model
  const model = llmConfig.models.find(m => m.id === model_id);
  if (!model) {
    return res.status(400).json({ error: 'Invalid model ID' });
  }
  
  // Update API key if provided
  if (api_key) {
    llmConfig.api_keys[model.provider] = api_key;
    
    // Reinitialize clients
    if (model.provider === 'openai') {
      openai.apiKey = api_key;
    } else if (model.provider === 'anthropic') {
      anthropic.apiKey = api_key;
    }
    // Qwen doesn't need reinitialization as we create a new client each time
  }
  
  // Set as active model
  llmConfig.active_model = model_id;
  
  // Save to file
  fs.writeFileSync(LLM_CONFIG_PATH, JSON.stringify(llmConfig, null, 2));
  
  res.json({ 
    success: true, 
    message: `${model.name} configured successfully and set as active model` 
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send existing history if any
  if (chatHistories.has(socket.id)) {
    socket.emit('chat-history', chatHistories.get(socket.id));
  }
  
  socket.on('process-instruction', async (data) => {
    const { instruction, serverName, model } = data;
    
    if (!instruction || !serverName) {
      socket.emit('agent-update', { 
        type: 'error',
        message: 'Instruction and server name are required'
      });
      return;
    }
    
    if (!serverConnections[serverName]) {
      socket.emit('agent-update', { 
        type: 'error',
        message: `Server ${serverName} not found`
      });
      return;
    }
    
    // Use provided model or active model from config, and include socket ID
    const agent = new DevOpsAgent(model || llmConfig.active_model, socket.id);
    await agent.processInstruction(instruction, serverName, socket);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Keep history for reconnection within 1 hour
    setTimeout(() => {
      if (chatHistories.has(socket.id)) {
        console.log('Cleaning up chat history for:', socket.id);
        chatHistories.delete(socket.id);
      }
    }, 3600000); // 1 hour
  });
});

// Serve the Vue app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});