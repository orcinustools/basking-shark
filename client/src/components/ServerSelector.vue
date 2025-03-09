<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  selectedServer: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:selectedServer']);

const servers = ref([]);
const isLoading = ref(false);
const error = ref('');

const fetchServers = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    const response = await fetch('/api/servers');
    const data = await response.json();
    
    if (response.ok) {
      servers.value = data.servers || [];
    } else {
      error.value = data.error || 'Failed to fetch servers';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

const selectServer = (serverName) => {
  emit('update:selectedServer', serverName);
};

onMounted(() => {
  fetchServers();
});
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-4 mb-4">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-lg font-semibold text-gray-700">Select Server</h3>
      <button 
        @click="fetchServers" 
        class="text-blue-600 hover:text-blue-800 text-sm"
        :disabled="isLoading"
      >
        <span v-if="isLoading">Refreshing...</span>
        <span v-else>Refresh</span>
      </button>
    </div>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
    
    <div v-if="servers.length === 0" class="text-center py-4 text-gray-500">
      No servers registered yet
    </div>
    
    <div v-else class="space-y-2">
      <div 
        v-for="server in servers" 
        :key="server.name"
        class="flex items-center p-3 rounded-md cursor-pointer transition-colors"
        :class="selectedServer === server.name ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'"
        @click="selectServer(server.name)"
      >
        <div class="flex-shrink-0 mr-3">
          <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
               :class="selectedServer === server.name ? 'border-blue-500' : 'border-gray-400'">
            <div v-if="selectedServer === server.name" class="w-3 h-3 rounded-full bg-blue-500"></div>
          </div>
        </div>
        <div>
          <div class="font-medium">{{ server.name }}</div>
          <div class="text-sm text-gray-500">{{ server.username }}@{{ server.host }}</div>
        </div>
      </div>
    </div>
    
    <!-- Slot for additional content after the server list -->
    <slot name="after-servers"></slot>
  </div>
</template>