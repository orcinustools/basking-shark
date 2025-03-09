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

// AI Agent with Chain of Thought
class DevOpsAgent {
  constructor(model = 'openai') {
    this.model = model;
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
      
      if (modelConfig.provider === 'anthropic') {
        response = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: modelConfig.max_tokens || 2000,
          temperature: modelConfig.temperature || 0.2,
          system: `You are a DevOps AI agent that helps manage servers. You need to:
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

Be precise with your commands. Use standard Linux/Unix commands that would work on most distributions. Don't use placeholder values - if you need to make assumptions, state them in your thinking.`,
          messages: [
            {
              role: "user",
              content: `I need you to help me with the following task on my server named "${serverName}":
              
${instruction}

Please analyze this request, break it down using Chain of Thought reasoning, and determine the exact commands needed.`
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
              content: `You are a DevOps AI agent that helps manage servers. You need to:
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

Be precise with your commands. Use standard Linux/Unix commands that would work on most distributions. Don't use placeholder values - if you need to make assumptions, state them in your thinking.`
            },
            {
              role: "user",
              content: `I need you to help me with the following task on my server named "${serverName}":
              
${instruction}

Please analyze this request, break it down using Chain of Thought reasoning, and determine the exact commands needed.`
            }
          ]
        });
        
        const parsedResponse = JSON.parse(response.choices[0].message.content);
        thinking = parsedResponse.thinking || [];
        actions = parsedResponse.actions || [];
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
    
    const conn = new Client();
    
    try {
      return await new Promise((resolve, reject) => {
        conn.on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              reject(err);
              return;
            }
            
            let output = '';
            let errorOutput = '';
            
            stream.on('data', (data) => {
              output += data.toString();
            });
            
            stream.stderr.on('data', (data) => {
              errorOutput += data.toString();
            });
            
            stream.on('close', (code) => {
              conn.end();
              resolve({ output, errorOutput, exitCode: code });
            });
          });
        }).on('error', (err) => {
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
      
      if (modelConfig.provider === 'anthropic') {
        const response = await anthropic.messages.create({
          model: modelConfig.model,
          max_tokens: modelConfig.max_tokens || 1500,
          temperature: modelConfig.temperature || 0.3,
          system: "You are a DevOps AI assistant that analyzes the results of server commands and provides insights. Be thorough but concise.",
          messages: [
            {
              role: "user",
              content: `I executed the following commands based on this instruction: "${context.instruction}"

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
5. Any recommendations for improvement`
            }
          ]
        });
        
        analysis = response.content[0].text;
      } else {
        // Default to OpenAI
        const response = await openai.chat.completions.create({
          model: modelConfig.model,
          temperature: modelConfig.temperature || 0.3,
          max_tokens: modelConfig.max_tokens,
          messages: [
            {
              role: "system",
              content: "You are a DevOps AI assistant that analyzes the results of server commands and provides insights. Be thorough but concise."
            },
            {
              role: "user",
              content: `I executed the following commands based on this instruction: "${context.instruction}"

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
5. Any recommendations for improvement`
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
    default_model: llmConfig.default_model
  };
  
  res.json(safeConfig);
});

app.post('/api/llm-config', (req, res) => {
  const { api_keys } = req.body;
  
  if (api_keys) {
    // Update API keys
    if (api_keys.openai) {
      llmConfig.api_keys.openai = api_keys.openai;
    }
    
    if (api_keys.anthropic) {
      llmConfig.api_keys.anthropic = api_keys.anthropic;
    }
    
    // Save to file
    fs.writeFileSync(LLM_CONFIG_PATH, JSON.stringify(llmConfig, null, 2));
    
    // Reinitialize clients
    if (api_keys.openai) {
      openai.apiKey = api_keys.openai;
    }
    
    if (api_keys.anthropic) {
      anthropic.apiKey = api_keys.anthropic;
    }
    
    res.json({ success: true, message: 'LLM configuration updated successfully' });
  } else {
    res.status(400).json({ error: 'Invalid configuration' });
  }
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
    
    const agent = new DevOpsAgent(model || 'openai');
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