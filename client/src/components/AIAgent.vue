<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { io } from 'socket.io-client';
import MarkdownIt from 'markdown-it';
import Terminal from './Terminal.vue';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true
});

const props = defineProps({
  serverName: {
    type: String,
    required: true
  },
  serverConfig: {
    type: Object,
    required: true
  }
});

const terminalRef = ref(null);
const currentCommand = ref('');
const isExecuting = ref(false);
const connectionStatus = ref({});

const instruction = ref('');
const isProcessing = ref(false);
const currentStep = ref('idle'); // idle, thinking, executing, analyzing, complete, error
const chatContainer = ref(null);
const hasInteraction = ref(false);

// Conversation history
const conversationHistory = ref([]);

// Socket connection
const socket = ref(null);

// Connect to socket.io and handle updates
onMounted(() => {
  socket.value = io();
  
  socket.value.on('agent-update', async (data) => {
    const currentInteraction = conversationHistory.value[conversationHistory.value.length - 1];
    
    if (data.type === 'thinking') {
      currentStep.value = 'thinking';
    } else if (data.type === 'thinking-complete') {
      if (currentInteraction) {
        currentInteraction.thinking = data.thinking;
        if (data.evaluation) {
          currentInteraction.evaluation = data.evaluation;
        }
      }
    } else if (data.type === 'executing') {
      currentStep.value = 'executing';
      isExecuting.value = true;
      const cmd = data.message.replace('Executing: ', '');
      currentCommand.value = cmd;
      // Update connection status when executing command
      connectionStatus.value[props.serverName] = { connected: true };
      if (currentInteraction) {
        if (!currentInteraction.actions) {
          currentInteraction.actions = [];
        }
        if (!currentInteraction.results) {
          currentInteraction.results = [];
        }
        if (currentInteraction.actions.length <= data.index) {
          currentInteraction.actions.push({ 
            command: cmd,
            status: 'running'
          });
        }
      }
    } else if (data.type === 'execution-result') {
      isExecuting.value = false;
      currentCommand.value = '';
      if (terminalRef.value) {
        if (data.result.output) {
          terminalRef.value.addCommandOutput(data.result.output);
        }
        if (data.result.error) {
          terminalRef.value.addCommandOutput(data.result.error, true);
        }
      }
      if (currentInteraction && currentInteraction.actions) {
        if (currentInteraction.results.length <= data.index) {
          currentInteraction.results.push(data.result);
        } else {
          currentInteraction.results[data.index] = data.result;
        }
        currentInteraction.actions[data.index].status = 
          data.result.exitCode === 0 ? 'success' : 'error';
      }
    } else if (data.type === 'analyzing') {
      currentStep.value = 'analyzing';
    } else if (data.type === 'complete') {
      currentStep.value = 'complete';
      if (currentInteraction) {
        currentInteraction.analysis = data.analysis;
        if (data.evaluation) {
          currentInteraction.evaluation = data.evaluation;
        }
      }
      isProcessing.value = false;
      instruction.value = '';
    } else if (data.type === 'error') {
      currentStep.value = 'error';
      if (currentInteraction) {
        currentInteraction.error = data.message;
        if (data.suggestions) {
          currentInteraction.suggestions = data.suggestions;
        }
      }
      // Update connection status on error
      if (data.message.includes('SSH connection error') || data.message.includes('authentication failed')) {
        connectionStatus.value[props.serverName] = { connected: false };
      }
      isProcessing.value = false;
    }

    // Scroll to bottom after update
    await nextTick();
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
  // Clear connection status
  connectionStatus.value = {};
});

const processInstruction = async () => {
  if (!instruction.value.trim()) return;
  
  hasInteraction.value = true;
  isProcessing.value = true;
  currentStep.value = 'thinking';
  
  // Add new interaction to history
  conversationHistory.value.push({
    instruction: instruction.value,
    thinking: [],
    actions: [],
    results: []
  });

  // Send instruction to server
  socket.value.emit('process-instruction', {
    instruction: instruction.value,
    serverName: props.serverName
  });

  // Scroll to bottom
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const handleEnter = (e) => {
  if (e.shiftKey) {
    // Allow new line with Shift+Enter
    return;
  }
  if (!isProcessing.value && instruction.value.trim()) {
    processInstruction();
  }
};

const copyCommand = (command) => {
  navigator.clipboard.writeText(command);
};

const exampleInstructions = [
  'Install and configure Nginx as a web server',
  'Set up a new user account with sudo privileges',
  'Check system performance and identify any issues',
  'Update all packages and reboot if necessary',
  'Install Docker and run a simple container',
  'Configure a basic firewall with UFW'
];

const useExample = (example) => {
  instruction.value = example;
  processInstruction();
};
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] gap-4">
    <!-- Left Side: Chat Interface -->
    <div class="flex-1 bg-white shadow-md rounded-lg p-6 flex flex-col overflow-hidden">
      <h2 class="text-2xl font-bold mb-2 text-gray-800">AI DevOps Agent</h2>
      <p class="text-gray-600 mb-4">
        Connected to <span class="font-semibold">{{ serverName }}</span>
      </p>

      <!-- Chat/Conversation Area -->
      <div class="flex-1 overflow-y-auto mb-4 space-y-4 chat-container" ref="chatContainer">
        <!-- Welcome Message -->
        <div v-if="!hasInteraction" class="text-center py-8">
          <h3 class="text-xl font-semibold text-gray-700 mb-4">Welcome to DevOps AI Agent! 👋</h3>
          <p class="text-gray-600 mb-6">I can help you manage your server with natural language commands.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 mb-2">Examples:</h4>
              <ul class="space-y-2">
                <li v-for="example in exampleInstructions" 
                    :key="example"
                    @click="useExample(example)"
                    class="text-blue-600 hover:text-blue-800 cursor-pointer text-sm hover:bg-blue-100 p-2 rounded">
                  "{{ example }}"
                </li>
              </ul>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
              <h4 class="font-semibold text-green-800 mb-2">Capabilities:</h4>
              <ul class="text-sm text-green-700 space-y-2">
                <li>✓ Execute system commands</li>
                <li>✓ Install & configure software</li>
                <li>✓ Manage services</li>
                <li>✓ Monitor system status</li>
                <li>✓ Handle errors automatically</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Conversation History -->
        <template v-for="(interaction, index) in conversationHistory" :key="index">
          <!-- User Message -->
          <div class="flex items-start mb-4">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span class="text-blue-600 text-sm">You</span>
            </div>
            <div class="ml-3 bg-blue-50 rounded-lg py-2 px-4 max-w-[80%]">
              <p class="text-gray-800">{{ interaction.instruction }}</p>
            </div>
          </div>

          <!-- AI Response -->
          <div class="flex items-start mb-4">
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span class="text-green-600 text-sm">AI</span>
            </div>
            <div class="ml-3 space-y-3 max-w-[80%]">
              <!-- Thinking Process -->
              <div v-if="interaction.thinking?.length" class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">Thought Process:</h4>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(thought, i) in interaction.thinking" 
                      :key="i"
                      class="text-sm text-gray-600">
                    {{ thought }}
                  </li>
                </ul>
              </div>

              <!-- Actions and Results -->
              <div v-if="interaction.actions?.length" class="space-y-2">
                <div v-for="(action, i) in interaction.actions" :key="i"
                     class="border rounded-md overflow-hidden bg-white">
                  <div class="bg-gray-100 px-3 py-2 flex items-center justify-between">
                    <code class="text-sm font-mono">$ {{ action.command }}</code>
                    <div class="flex items-center space-x-2">
                      <span v-if="interaction.results[i]" 
                            :class="interaction.results[i].exitCode === 0 ? 'text-green-600' : 'text-red-600'"
                            class="text-xs">
                        Exit: {{ interaction.results[i].exitCode }}
                      </span>
                      <button @click="copyCommand(action.command)"
                              class="text-gray-500 hover:text-gray-700 text-sm">
                        <span class="sr-only">Copy command</span>
                        📋
                      </button>
                    </div>
                  </div>
                  
                  <div v-if="interaction.results[i]" class="p-3">
                    <div v-if="interaction.results[i].output" 
                         class="bg-black text-green-400 p-2 rounded font-mono text-xs overflow-auto max-h-40">
                      <pre>{{ interaction.results[i].output }}</pre>
                    </div>
                    
                    <div v-if="interaction.results[i].error"
                         class="mt-2 bg-black text-red-400 p-2 rounded font-mono text-xs overflow-auto max-h-40">
                      <pre>{{ interaction.results[i].error }}</pre>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Analysis -->
              <div v-if="interaction.analysis" class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div class="prose prose-sm max-w-none markdown-content" v-html="md.render(interaction.analysis)"></div>
              </div>

              <!-- Error Message -->
              <div v-if="interaction.error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p class="text-red-700">{{ interaction.error }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Loading States -->
        <div v-if="isProcessing" class="flex items-start mb-4">
          <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span class="text-green-600 text-sm">AI</span>
          </div>
          <div class="ml-3 bg-gray-100 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-gray-600">
                <span v-if="currentStep === 'thinking'">Analyzing your request...</span>
                <span v-else-if="currentStep === 'executing'">Executing commands...</span>
                <span v-else-if="currentStep === 'analyzing'">Analyzing results...</span>
                <span v-else>Processing...</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t pt-4">
        <div class="flex space-x-4">
          <div class="flex-1">
            <textarea 
              v-model="instruction" 
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Type your command or question here..."
              :disabled="isProcessing"
              @keydown.enter.prevent="handleEnter"
            ></textarea>
          </div>
          <button 
            @click="processInstruction" 
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
            :disabled="isProcessing || !instruction.trim()"
          >
            <span v-if="isProcessing" class="animate-pulse">⏳</span>
            <span v-else>Send</span>
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>

    <!-- Right Side: Terminal -->
    <div class="w-[500px] bg-black rounded-lg shadow-xl overflow-hidden flex flex-col">
      <Terminal 
        ref="terminalRef"
        :server-info="serverConfig"
        :current-command="currentCommand"
        :is-executing="isExecuting"
      />
    </div>
  </div>
</template>