<script setup>
import { ref, onMounted } from 'vue';

const openaiKey = ref('');
const anthropicKey = ref('');
const isLoading = ref(false);
const message = ref('');
const error = ref('');

const saveConfig = async () => {
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
        api_keys: {
          openai: openaiKey.value,
          anthropic: anthropicKey.value
        }
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      message.value = data.message || 'Configuration saved successfully';
      // Clear the fields for security
      openaiKey.value = '';
      anthropicKey.value = '';
    } else {
      error.value = data.error || 'Failed to save configuration';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    const response = await fetch('/api/llm-config');
    if (response.ok) {
      // We don't get API keys back, just the model configuration
      // This is just to check if the endpoint is working
    }
  } catch (err) {
    error.value = 'Failed to load LLM configuration';
  }
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
    
    <form @submit.prevent="saveConfig" class="space-y-4">
      <div>
        <label for="openaiKey" class="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
        <input 
          id="openaiKey" 
          v-model="openaiKey" 
          type="password" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="sk-..."
        />
        <p class="text-xs text-gray-500 mt-1">Leave blank to keep current key</p>
      </div>
      
      <div>
        <label for="anthropicKey" class="block text-sm font-medium text-gray-700 mb-1">Anthropic API Key</label>
        <input 
          id="anthropicKey" 
          v-model="anthropicKey" 
          type="password" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="sk-ant-..."
        />
        <p class="text-xs text-gray-500 mt-1">Leave blank to keep current key</p>
      </div>
      
      <div>
        <button 
          type="submit" 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          :disabled="isLoading"
        >
          <span v-if="isLoading">Saving...</span>
          <span v-else>Save Configuration</span>
        </button>
      </div>
    </form>
  </div>
</template>