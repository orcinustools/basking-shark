<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const props = defineProps({
  serverName: {
    type: String,
    required: true
  }
});

const instruction = ref('');
const isProcessing = ref(false);
const error = ref('');
const socket = ref(null);

// Agent state
const thinking = ref([]);
const actions = ref([]);
const results = ref([]);
const analysis = ref('');
const currentStep = ref('idle'); // idle, thinking, executing, analyzing, complete, error

// Connect to socket.io
onMounted(() => {
  socket.value = io();
  
  socket.value.on('agent-update', (data) => {
    if (data.type === 'thinking') {
      currentStep.value = 'thinking';
    } else if (data.type === 'thinking-complete') {
      thinking.value = data.thinking;
    } else if (data.type === 'executing') {
      currentStep.value = 'executing';
      if (actions.value.length <= data.index) {
        actions.value.push({ command: data.message.replace('Executing: ', '') });
      }
    } else if (data.type === 'execution-result') {
      if (results.value.length <= data.index) {
        results.value.push(data.result);
      } else {
        results.value[data.index] = data.result;
      }
    } else if (data.type === 'analyzing') {
      currentStep.value = 'analyzing';
    } else if (data.type === 'complete') {
      currentStep.value = 'complete';
      analysis.value = data.analysis;
      isProcessing.value = false;
    } else if (data.type === 'error') {
      currentStep.value = 'error';
      error.value = data.message;
      isProcessing.value = false;
    }
  });
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

const processInstruction = () => {
  if (!instruction.value.trim()) return;
  
  // Reset state
  error.value = '';
  thinking.value = [];
  actions.value = [];
  results.value = [];
  analysis.value = '';
  currentStep.value = 'idle';
  isProcessing.value = true;
  
  // Send instruction to server
  socket.value.emit('process-instruction', {
    instruction: instruction.value,
    serverName: props.serverName
  });
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
};
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-6">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">AI DevOps Agent</h2>
    <p class="text-gray-600 mb-4">
      Tell the AI agent what you want to do on <span class="font-semibold">{{ serverName }}</span>, and it will break down the task and execute the necessary commands.
    </p>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
    
    <div class="mb-4">
      <label for="instruction" class="block text-sm font-medium text-gray-700 mb-1">What would you like to do?</label>
      <textarea 
        id="instruction" 
        v-model="instruction" 
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="e.g., Install and configure Nginx as a web server"
        :disabled="isProcessing"
      ></textarea>
    </div>
    
    <div class="mb-4">
      <h3 class="text-sm font-medium text-gray-700 mb-2">Examples:</h3>
      <div class="flex flex-wrap gap-2">
        <button 
          v-for="example in exampleInstructions" 
          :key="example"
          @click="useExample(example)"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1 px-3 rounded text-sm"
          :disabled="isProcessing"
        >
          {{ example }}
        </button>
      </div>
    </div>
    
    <div class="mb-6">
      <button 
        @click="processInstruction" 
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        :disabled="isProcessing || !instruction.trim()"
      >
        <span v-if="isProcessing">Processing...</span>
        <span v-else>Process Instruction</span>
      </button>
    </div>
    
    <!-- Agent Thinking Process -->
    <div v-if="thinking.length > 0" class="mb-6">
      <h3 class="text-lg font-semibold mb-2 text-gray-700">Chain of Thought</h3>
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <ul class="list-disc list-inside space-y-2">
          <li v-for="(step, index) in thinking" :key="index" class="text-gray-700">
            {{ step }}
          </li>
        </ul>
      </div>
    </div>
    
    <!-- Actions and Results -->
    <div v-if="actions.length > 0" class="mb-6">
      <h3 class="text-lg font-semibold mb-2 text-gray-700">Actions</h3>
      <div class="space-y-4">
        <div 
          v-for="(action, index) in actions" 
          :key="index"
          class="border rounded-md overflow-hidden"
        >
          <div class="bg-gray-100 px-4 py-2 font-mono text-sm">
            $ {{ action.command }}
          </div>
          
          <div v-if="results[index]" class="p-4">
            <div v-if="results[index].output" class="bg-black text-green-400 p-3 rounded font-mono text-xs overflow-auto max-h-60 mb-2">
              <pre>{{ results[index].output }}</pre>
            </div>
            
            <div v-if="results[index].error" class="bg-black text-red-400 p-3 rounded font-mono text-xs overflow-auto max-h-60">
              <pre>{{ results[index].error }}</pre>
            </div>
            
            <div class="text-xs text-gray-500 mt-1">
              Exit Code: {{ results[index].exitCode }}
            </div>
          </div>
          
          <div v-else-if="currentStep === 'executing' && index === actions.length - 1" class="p-4">
            <div class="animate-pulse flex space-x-4">
              <div class="flex-1 space-y-2 py-1">
                <div class="h-2 bg-gray-200 rounded"></div>
                <div class="h-2 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Analysis -->
    <div v-if="analysis" class="mb-6">
      <h3 class="text-lg font-semibold mb-2 text-gray-700">Analysis</h3>
      <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <div class="prose prose-sm max-w-none" v-html="analysis.replace(/\n/g, '<br>')"></div>
      </div>
    </div>
    
    <!-- Loading States -->
    <div v-if="isProcessing && currentStep === 'thinking'" class="mb-6">
      <div class="flex items-center justify-center space-x-2 text-gray-500">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Thinking with Chain of Thought...</span>
      </div>
    </div>
    
    <div v-if="isProcessing && currentStep === 'analyzing'" class="mb-6">
      <div class="flex items-center justify-center space-x-2 text-gray-500">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Analyzing results...</span>
      </div>
    </div>
  </div>
</template>