<script setup>
import { ref, onMounted } from 'vue';

const models = ref([]);
const selectedModel = ref('');
const apiKey = ref('');
const isLoading = ref(false);
const message = ref('');
const error = ref('');

const loadConfig = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    const response = await fetch('/api/llm-config');
    const data = await response.json();
    
    if (response.ok) {
      models.value = data.models || [];
      selectedModel.value = data.active_model || data.default_model || '';
    } else {
      error.value = data.error || 'Failed to load LLM configuration';
    }
  } catch (err) {
    error.value = err.message || 'Failed to load LLM configuration';
  } finally {
    isLoading.value = false;
  }
};

const saveConfig = async () => {
  if (!selectedModel.value) {
    error.value = 'Please select a model';
    return;
  }
  
  error.value = '';
  message.value = '';
  isLoading.value = true;
  
  try {
    const response = await fetch('/api/llm-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: selectedModel.value,
        api_key: apiKey.value
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      message.value = data.message || 'Configuration saved successfully';
      // Clear the API key field for security
      apiKey.value = '';
    } else {
      error.value = data.error || 'Failed to save configuration';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

const getApiKeyPlaceholder = (modelId) => {
  const model = models.value.find(m => m.id === modelId);
  if (!model) return '';
  
  switch (model.provider) {
    case 'openai':
      return 'sk-...';
    case 'anthropic':
      return 'sk-ant-...';
    case 'qwen':
      return 'sk-...';
    default:
      return '';
  }
};

const getModelProviderName = (modelId) => {
  const model = models.value.find(m => m.id === modelId);
  if (!model) return '';
  
  switch (model.provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'qwen':
      return 'Qwen';
    default:
      return model.provider;
  }
};

onMounted(() => {
  loadConfig();
});
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">LLM Configuration</h2>
    
    <div v-if="message" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {{ message }}
    </div>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
    
    <div v-if="isLoading && models.length === 0" class="text-center py-4">
      <div class="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p class="text-gray-500">Loading models...</p>
    </div>
    
    <form v-else @submit.prevent="saveConfig" class="space-y-6">
      <!-- Model Selection -->
      <div>
        <h3 class="text-lg font-semibold mb-2 text-gray-700">Select Model</h3>
        <div class="space-y-2">
          <div 
            v-for="model in models" 
            :key="model.id"
            class="flex items-center p-3 rounded-md cursor-pointer transition-colors"
            :class="selectedModel === model.id ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'"
            @click="selectedModel = model.id"
          >
            <div class="flex-shrink-0 mr-3">
              <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                   :class="selectedModel === model.id ? 'border-blue-500' : 'border-gray-400'">
                <div v-if="selectedModel === model.id" class="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
            </div>
            <div class="flex-1">
              <div class="font-medium flex items-center">
                {{ model.name }}
                <span v-if="model.id === selectedModel" class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Active</span>
              </div>
              <div class="text-sm text-gray-500">{{ model.description }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- API Key Input -->
      <div v-if="selectedModel">
        <label :for="'apiKey-' + selectedModel" class="block text-sm font-medium text-gray-700 mb-1">
          {{ getModelProviderName(selectedModel) }} API Key
        </label>
        <input 
          :id="'apiKey-' + selectedModel" 
          v-model="apiKey" 
          type="password" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="getApiKeyPlaceholder(selectedModel)"
        />
        <p class="text-xs text-gray-500 mt-1">Leave blank to keep current key</p>
      </div>
      
      <div>
        <button 
          type="submit" 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          :disabled="isLoading || !selectedModel"
        >
          <span v-if="isLoading">Saving...</span>
          <span v-else>Save Configuration</span>
        </button>
      </div>
    </form>
  </div>
</template>