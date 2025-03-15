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
const showEditForm = ref(false);
const editingServer = ref(null);
const deleteConfirmServer = ref(null);

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

const editServer = (server) => {
  // Create a deep copy and ensure port is number
  editingServer.value = { 
    ...server,
    port: parseInt(server.port) || 22, // Convert to number, default to 22 if invalid
    existingPassword: server.authType === 'password',
    existingKey: server.authType === 'privateKey',
    // Don't clear existing credentials
    password: server.password || '',
    privateKey: server.privateKey || ''
  };
  console.log('Editing server:', {
    ...editingServer.value,
    password: editingServer.value.password ? '[REDACTED]' : undefined,
    privateKey: editingServer.value.privateKey ? '[REDACTED]' : undefined
  });
  showEditForm.value = true;
};

const confirmDeleteServer = (server) => {
  deleteConfirmServer.value = server;
};

const cancelEdit = () => {
  editingServer.value = null;
  showEditForm.value = false;
};

const validateServerData = (data) => {
  const errors = [];
  if (!data.host?.trim()) errors.push("Host is required");
  if (!data.username?.trim()) errors.push("Username is required");
  
  const port = parseInt(data.port);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push("Port must be a number between 1 and 65535");
  }
  
  if (data.authType === 'password' && !data.password?.trim() && !editingServer.value.existingPassword) {
    errors.push("Password is required");
  }
  if (data.authType === 'privateKey' && !data.privateKey?.trim() && !editingServer.value.existingKey) {
    errors.push("Private key is required");
  }
  
  return errors;
};

const saveServer = async () => {
  if (!editingServer.value) return;
  
  // Validate form
  const validationErrors = validateServerData(editingServer.value);
  if (validationErrors.length > 0) {
    error.value = validationErrors.join(", ");
    return;
  }
  
  isLoading.value = true;
  error.value = '';
  
  try {
    // Prepare data with correct types
    const serverData = {
      name: editingServer.value.name,
      host: editingServer.value.host.trim(),
      port: parseInt(editingServer.value.port) || 22,
      username: editingServer.value.username.trim(),
      authType: editingServer.value.authType
    };

    // Only include password/key if they were changed
    if (editingServer.value.authType === 'password' && editingServer.value.password?.trim()) {
      serverData.password = editingServer.value.password.trim();
    } else if (editingServer.value.authType === 'privateKey' && editingServer.value.privateKey?.trim()) {
      serverData.privateKey = editingServer.value.privateKey.trim();
    }

    console.log('Updating server:', editingServer.value.name, 'with data:', { 
      ...serverData, 
      password: serverData.password ? '[REDACTED]' : undefined,
      privateKey: serverData.privateKey ? '[REDACTED]' : undefined
    });

    const response = await fetch(`/api/servers/${editingServer.value.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serverData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      await fetchServers();
      showEditForm.value = false;
      editingServer.value = null;
    } else {
      error.value = data.error || 'Failed to update server';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

const deleteServer = async () => {
  if (!deleteConfirmServer.value) return;
  
  isLoading.value = true;
  error.value = '';
  
  try {
    const response = await fetch(`/api/servers/${deleteConfirmServer.value.name}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      if (props.selectedServer === deleteConfirmServer.value.name) {
        emit('update:selectedServer', '');
      }
      await fetchServers();
    } else {
      const data = await response.json();
      error.value = data.error || 'Failed to delete server';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
    deleteConfirmServer.value = null;
  }
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
        class="flex items-center p-3 rounded-md transition-colors"
        :class="selectedServer === server.name ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'"
      >
        <div class="flex-shrink-0 mr-3 cursor-pointer" @click="selectServer(server.name)">
          <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
               :class="selectedServer === server.name ? 'border-blue-500' : 'border-gray-400'">
            <div v-if="selectedServer === server.name" class="w-3 h-3 rounded-full bg-blue-500"></div>
          </div>
        </div>
        <div class="flex-1 cursor-pointer" @click="selectServer(server.name)">
          <div class="font-medium">{{ server.name }}</div>
          <div class="text-sm text-gray-500">{{ server.username }}@{{ server.host }}</div>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            @click="editServer(server)"
            class="text-blue-600 hover:text-blue-800 p-1 rounded"
            title="Edit server"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button 
            @click="confirmDeleteServer(server)"
            class="text-red-600 hover:text-red-800 p-1 rounded"
            title="Delete server"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Edit Server Form -->
      <div v-if="showEditForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 class="text-lg font-semibold mb-4">Edit Server</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Server Name</label>
              <input 
                type="text" 
                v-model="editingServer.name"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Host</label>
              <input 
                type="text" 
                v-model="editingServer.host"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Port</label>
              <input 
                type="number" 
                v-model="editingServer.port"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Username</label>
              <input 
                type="text" 
                v-model="editingServer.username"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Authentication Type</label>
              <select 
                v-model="editingServer.authType"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="password">Password</option>
                <option value="privateKey">Private Key</option>
              </select>
            </div>
            
            <div v-if="editingServer.authType === 'password'">
              <label class="block text-sm font-medium text-gray-700">
                Password
                <span v-if="editingServer.existingPassword" class="text-green-600 text-xs ml-2">
                  (Current password saved)
                </span>
              </label>
              <div class="mt-1 relative">
                <input 
                  type="password" 
                  v-model="editingServer.password"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  :placeholder="editingServer.existingPassword ? 'Leave blank to keep current password' : 'Enter password'"
                />
                <div v-if="editingServer.existingPassword" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div v-else>
              <label class="block text-sm font-medium text-gray-700">
                Private Key
                <span v-if="editingServer.existingKey" class="text-green-600 text-xs ml-2">
                  (Current key saved)
                </span>
              </label>
              <div class="mt-1 relative">
                <textarea 
                  v-model="editingServer.privateKey"
                  rows="4"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  :placeholder="editingServer.existingKey ? 'Leave blank to keep current key' : 'Enter private key'"
                ></textarea>
                <div v-if="editingServer.existingKey" class="absolute top-2 right-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              @click="cancelEdit"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              @click="saveServer"
              class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="deleteConfirmServer" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 class="text-lg font-semibold mb-4">Delete Server</h3>
          <p class="text-gray-600 mb-6">
            Are you sure you want to delete the server "{{ deleteConfirmServer.name }}"? This action cannot be undone.
          </p>
          
          <div class="flex justify-end space-x-3">
            <button 
              @click="deleteConfirmServer = null"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              @click="deleteServer"
              class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Deleting...' : 'Delete Server' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Slot for additional content after the server list -->
    <slot name="after-servers"></slot>
  </div>
</template>