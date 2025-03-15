<script setup>
import { ref, onMounted } from 'vue';
import ServerRegistration from './components/ServerRegistration.vue';
import ServerSelector from './components/ServerSelector.vue';
import AIAgent from './components/AIAgent.vue';
import LLMConfig from './components/LLMConfig.vue';

const selectedServer = ref('');
const showServerRegistration = ref(false);
const serverConfigs = ref({});

// Load server configurations
const loadServerConfigs = async () => {
  try {
    const response = await fetch('/api/servers');
    const data = await response.json();
    if (data.servers) {
      serverConfigs.value = data.servers.reduce((acc, server) => {
        acc[server.name] = server;
        return acc;
      }, {});
    }
  } catch (error) {
    console.error('Error loading server configurations:', error);
  }
};

const handleServerRegistered = async (serverName) => {
  await loadServerConfigs();
  selectedServer.value = serverName;
  showServerRegistration.value = false; // Hide the form after successful registration
};

// Load configs on mount
onMounted(() => {
  loadServerConfigs();
});

const toggleServerRegistration = () => {
  showServerRegistration.value = !showServerRegistration.value;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-blue-700 text-white p-4 shadow-md">
      <div class="container mx-auto">
        <h1 class="text-3xl font-bold">DevOps AI Agent</h1>
        <p class="text-blue-100">AI-powered server management with Chain of Thought reasoning</p>
      </div>
    </header>
    
    <main class="container mx-auto py-6 px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Server Management Column -->
        <div class="md:col-span-1">
          <ServerSelector v-model:selectedServer="selectedServer">
            <template #after-servers>
              <div class="mt-3 text-center">
                <button 
                  @click="toggleServerRegistration" 
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  {{ showServerRegistration ? 'Cancel' : 'Add New Server' }}
                </button>
              </div>
            </template>
          </ServerSelector>
          
          <!-- Server Registration Form (appears below ServerSelector) -->
          <div v-if="showServerRegistration" class="mt-4">
            <ServerRegistration @server-registered="handleServerRegistered" />
          </div>
          
          <LLMConfig />
        </div>
        
        <!-- AI Agent Column -->
        <div class="md:col-span-2">
          <div v-if="selectedServer">
            <AIAgent 
              :server-name="selectedServer"
              :server-config="serverConfigs[selectedServer]"
            />
          </div>
          
          <!-- Placeholder when no server is selected -->
          <div v-else class="bg-white shadow-md rounded-lg p-6 flex items-center justify-center h-64">
            <div class="text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <p class="text-xl">Register or select a server to get started</p>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <footer class="bg-gray-800 text-white p-4 mt-8">
      <div class="container mx-auto text-center">
        <p>DevOps AI Agent - AI-powered server management with Chain of Thought reasoning</p>
      </div>
    </footer>
  </div>
</template>
