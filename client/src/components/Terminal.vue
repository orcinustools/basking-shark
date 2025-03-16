<template>
  <div class="flex flex-col h-full bg-black text-green-400 font-mono text-sm overflow-hidden">
    <!-- Terminal Header -->
    <div class="bg-[#2D2D2D] px-4 py-2 flex flex-col border-b border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 cursor-pointer"></div>
          <div class="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 cursor-pointer"></div>
          <div class="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 cursor-pointer"></div>
        </div>
        <div class="text-gray-400 text-xs font-semibold">
          {{ serverInfo.username }}@{{ serverInfo.host }}
        </div>
      </div>
      
      <!-- Batch Progress -->
      <div v-if="isBatchMode && batchCommands.length > 0" class="mt-2">
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>Executing batch commands: {{ currentBatchIndex + 1 }}/{{ batchCommands.length }}</span>
          <span>{{ Math.round(((currentBatchIndex + 1) / batchCommands.length) * 100) }}%</span>
        </div>
        <div class="w-full h-1 bg-gray-700 rounded-full mt-1">
          <div class="h-full bg-[#27C93F] rounded-full transition-all duration-300"
               :style="{ width: `${((currentBatchIndex + 1) / batchCommands.length) * 100}%` }">
          </div>
        </div>
      </div>
    </div>

    <!-- Terminal Content -->
    <div class="flex-1 p-4 overflow-y-auto font-mono" ref="terminalContent" style="background-color: #1E1E1E;">
      <div v-for="(entry, index) in terminalHistory" :key="index" class="mb-2">
        <!-- Prompt Line -->
        <div class="flex items-start flex-wrap" v-if="entry.type === 'prompt'">
          <span class="text-[#61AFEF]">{{ serverInfo.username }}@{{ serverInfo.host }}</span>
          <span class="text-gray-500">:</span>
          <span class="text-[#E5C07B]">~</span>
          <span class="text-gray-500">$ </span>
          <span class="ml-1 text-[#ABB2BF]">{{ entry.content }}</span>
        </div>

        <!-- Output Line -->
        <div v-else-if="entry.type === 'output'" 
             :class="{
               'text-red-400': entry.isError,
               'text-[#98C379]': !entry.isError
             }"
             class="whitespace-pre-wrap pl-4 border-l-2 border-gray-700 my-2">{{ entry.content }}</div>

        <!-- Status Line -->
        <div v-else-if="entry.type === 'status'"
             class="text-[#61AFEF] italic text-xs pl-4">
          {{ entry.content }}
        </div>
      </div>

      <!-- Current Prompt -->
      <div v-if="showPrompt" class="flex items-start flex-wrap">
        <span class="text-[#61AFEF]">{{ serverInfo.username }}@{{ serverInfo.host }}</span>
        <span class="text-gray-500">:</span>
        <span class="text-[#E5C07B]">~</span>
        <span class="text-gray-500">$ </span>
        <span class="ml-1 w-2 h-4 bg-green-400 animate-pulse"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';

const props = defineProps({
  serverInfo: {
    type: Object,
    required: true
  },
  currentCommand: {
    type: String,
    default: ''
  },
  isExecuting: {
    type: Boolean,
    default: false
  },
  isBatchMode: {
    type: Boolean,
    default: false
  },
  batchCommands: {
    type: Array,
    default: () => []
  },
  currentBatchIndex: {
    type: Number,
    default: -1
  }
});

const terminalContent = ref(null);
const terminalHistory = ref([]);
const showPrompt = ref(true);

// Add entry to terminal history
const addToHistory = (entry) => {
  terminalHistory.value.push(entry);
  nextTick(() => {
    if (terminalContent.value) {
      terminalContent.value.scrollTop = terminalContent.value.scrollHeight;
    }
  });
};

// Watch for command changes
watch(() => props.currentCommand, (newCommand) => {
  if (newCommand) {
    addToHistory({
      type: 'prompt',
      content: newCommand
    });
  }
});

// Watch for execution status
watch(() => props.isExecuting, (isExecuting) => {
  showPrompt.value = !isExecuting;
  if (isExecuting) {
    addToHistory({
      type: 'status',
      content: 'Executing command...'
    });
  }
});

// Method to add command output
const addCommandOutput = (output, isError = false) => {
  addToHistory({
    type: 'output',
    content: output,
    isError
  });
};

// Expose methods to parent
defineExpose({
  addCommandOutput
});
</script>

<style scoped>
.terminal-content::-webkit-scrollbar {
  width: 8px;
}

.terminal-content::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>