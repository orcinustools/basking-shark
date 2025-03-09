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

// Initialize AI clients
const openai = new OpenAI({
  apiKey: llmConfig.api_keys.openai || 'your-openai-api-key'
});

const anthropic = new Anthropic({
  apiKey: llmConfig.api_keys.anthropic || 'your-anthropic-api-key'
});

// Qwen API is handled through OpenAI client with a different base URL
// We'll implement this in the DevOpsAgent class when needed

// AI Agent with Chain of Thought
class DevOpsAgent {
  constructor(model = null) {
    // Use provided model, active model, or default model
    this.model = model || llmConfig.active_model || llmConfig.default_model;
    this.thinking = [];
    this.actions = [];
    this.results = [];
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
      
      const planningResult = await this.planWithCoT(instruction, serverName);
      this.thinking = planningResult.thinking;
      this.actions = planningResult.actions;
      
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
      
      socket.emit('agent-update', { 
        type: 'complete',
        analysis: analysis
      });
      
      return {
        thinking: this.thinking,
        actions: this.actions,
        results: this.results,
        analysis: analysis
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
        actions: this.actions.map(a => a.command),
        results: this.results
      };
      
      let analysis;
      const modelConfig = llmConfig.models.find(m => m.id === this.model) || 
                          llmConfig.models.find(m => m.id === llmConfig.default_model) ||
                          { provider: 'openai', model: 'gpt-4', temperature: 0.3, max_tokens: 1500 };
      
      // System prompt for all models
      const systemPrompt = "You are a DevOps AI assistant that analyzes the results of server commands and provides insights. Be thorough but concise.";
      
      // User prompt for all models
      const userPrompt = `I executed the following commands based on this instruction: "${context.instruction}"

Here are the commands and their results:
${context.results.map(r => `
Command: ${r.command}
Output: ${r.output}
Error: ${r.error}
Exit Code: ${r.exitCode}
`).join('\n')}

Please analyze these results and tell me:
1. Whether the overall task was successful
2. What each command accomplished
3. If there were any issues or errors
4. What the next steps should be (if any)
5. Any recommendations for improvement`;

      if (modelConfig.provider === 'anthropic') {
        const response = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: modelConfig.max_tokens || 1500,
          temperature: modelConfig.temperature || 0.3,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt
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
              content: userPrompt
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
  console.log('New client connected');
  
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
    
    // Use provided model or active model from config
    const agent = new DevOpsAgent(model || llmConfig.active_model);
    await agent.processInstruction(instruction, serverName, socket);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
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