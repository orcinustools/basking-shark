<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelType: {
    type: String,
    default: 'openai'
  }
});

const emit = defineEmits(['update:modelType']);

const models = [
  { id: 'openai', name: 'OpenAI GPT-4', description: 'Powerful model for general-purpose tasks' },
  { id: 'claude', name: 'Claude 3.7 Sonnet', description: 'Advanced reasoning and detailed explanations' }
];

const selectModel = (modelId) => {
  emit('update:modelType', modelId);
};
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-4 mb-4">
    <h3 class="text-lg font-semibold mb-2 text-gray-700">Select AI Model</h3>
    <div class="flex flex-col space-y-2">
      <div 
        v-for="model in models" 
        :key="model.id"
        class="flex items-center p-3 rounded-md cursor-pointer transition-colors"
        :class="modelType === model.id ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'"
        @click="selectModel(model.id)"
      >
        <div class="flex-shrink-0 mr-3">
          <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
               :class="modelType === model.id ? 'border-blue-500' : 'border-gray-400'">
            <div v-if="modelType === model.id" class="w-3 h-3 rounded-full bg-blue-500"></div>
          </div>
        </div>
        <div>
          <div class="font-medium">{{ model.name }}</div>
          <div class="text-sm text-gray-500">{{ model.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>