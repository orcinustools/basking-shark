<script setup>
import { ref } from 'vue';

const serverName = ref('');
const host = ref('');
const port = ref('22');
const username = ref('');
const authType = ref('password');
const password = ref('');
const privateKey = ref('');
const isLoading = ref(false);
const message = ref('');
const error = ref('');

const emit = defineEmits(['server-registered']);

const registerServer = async () => {
  error.value = '';
  message.value = '';
  isLoading.value = true;
  
  try {
    const response = await fetch('/api/register-server', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverName: serverName.value,
        host: host.value,
        port: port.value ? parseInt(port.value) : 22,
        username: username.value,
        authType: authType.value,
        password: authType.value === 'password' ? password.value : undefined,
        privateKey: authType.value === 'privateKey' ? privateKey.value : undefined,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      message.value = data.message;
      emit('server-registered', serverName.value);
      
      // Reset form
      serverName.value = '';
      host.value = '';
      port.value = '22';
      username.value = '';
      password.value = '';
      privateKey.value = '';
    } else {
      error.value = data.error || 'Failed to register server';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">Register Server</h2>
    
    <div v-if="message" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {{ message }}
    </div>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
    
    <form @submit.prevent="registerServer" class="space-y-4">
      <div>
        <label for="serverName" class="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
        <input 
          id="serverName" 
          v-model="serverName" 
          type="text" 
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Production Server"
        />
      </div>
      
      <div>
        <label for="host" class="block text-sm font-medium text-gray-700 mb-1">Host</label>
        <input 
          id="host" 
          v-model="host" 
          type="text" 
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 192.168.1.100 or example.com"
        />
      </div>
      
      <div>
        <label for="port" class="block text-sm font-medium text-gray-700 mb-1">Port</label>
        <input 
          id="port" 
          v-model="port" 
          type="number" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="22"
        />
      </div>
      
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input 
          id="username" 
          v-model="username" 
          type="text" 
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., root"
        />
      </div>
      
      <div>
        <label for="authType" class="block text-sm font-medium text-gray-700 mb-1">Authentication Type</label>
        <select 
          id="authType" 
          v-model="authType"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="password">Password</option>
          <option value="privateKey">Private Key</option>
        </select>
      </div>
      
      <div v-if="authType === 'password'">
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div v-if="authType === 'privateKey'">
        <label for="privateKey" class="block text-sm font-medium text-gray-700 mb-1">Private Key</label>
        <textarea 
          id="privateKey" 
          v-model="privateKey" 
          required
          rows="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="-----BEGIN RSA PRIVATE KEY-----..."
        ></textarea>
      </div>
      
      <div>
        <button 
          type="submit" 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          :disabled="isLoading"
        >
          <span v-if="isLoading">Registering...</span>
          <span v-else>Register Server</span>
        </button>
      </div>
    </form>
  </div>
</template>