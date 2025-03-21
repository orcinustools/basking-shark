<script setup>
import { ref, onMounted } from 'vue';
import ServerRegistration from './components/ServerRegistration.vue';
import ServerSelector from './components/ServerSelector.vue';
import AIAgent from './components/AIAgent.vue';
import LLMConfig from './components/LLMConfig.vue';

const selectedServer = ref('');
const showServerRegistration = ref(false);
const serverConfigs = ref({});
const showLeftPanel = ref(true); // For toggling left panel visibility

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
    <header class="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 shadow-md">
      <div class="container mx-auto flex justify-between items-center">
        <div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-yellow-300 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 absolute top-0 left-0 text-white opacity-50" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h1 class="text-3xl font-bold">Basking Shark</h1>
          </div>
          <p class="text-blue-100 font-medium mt-1">
            <span class="text-yellow-300">🔥 Unleash the Power of AI</span> - Dominate Your Server Management!
          </p>
        </div>
        <button 
          v-if="selectedServer"
          @click="showLeftPanel = !showLeftPanel"
          class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <span v-if="showLeftPanel">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3 0v14h10V3H6z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span v-else>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1H3zm1 2v10h12V5H4z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span class="hidden md:inline">{{ showLeftPanel ? 'Hide' : 'Show' }} Config</span>
        </button>
      </div>
    </header>
    
    <main class="container mx-auto py-6 px-4">
      <div class="flex gap-6">
        <!-- Server Management Column -->
        <div 
          v-if="showLeftPanel || !selectedServer" 
          class="w-80 transition-all duration-300 ease-in-out"
        >
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
        <div class="flex-1">
          <div v-if="selectedServer">
            <AIAgent 
              :server-name="selectedServer"
              :server-config="serverConfigs[selectedServer]"
              :connection-status="connectionStatus"
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
    
    <footer class="bg-gradient-to-r from-gray-900 to-blue-900 text-white p-4 mt-8">
      <div class="container mx-auto text-center">
        <div class="flex items-center justify-center gap-2 mb-1">
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-300 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 absolute top-0 left-0 text-white opacity-50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span class="font-bold">Basking Shark</span>
        </div>
        <p class="text-sm text-blue-200">Empowering DevOps with AI-Driven Server Management 🚀</p>
      </div>
    </footer>
  </div>
</template>
