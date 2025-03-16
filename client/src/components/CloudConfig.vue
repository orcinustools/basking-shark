<template>
  <div class="card-dark-glow p-6 mt-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-[var(--primary)] glow-text">Cloud Providers</h3>
      <button 
        @click="addProvider" 
        class="px-4 py-2 bg-[var(--primary)] bg-opacity-20 border border-[var(--primary)] text-[var(--text-bright)] rounded-md text-sm font-medium hover:bg-opacity-30 transition-all hover:glow-border flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Provider
      </button>
    </div>

    <!-- Provider List -->
    <div class="space-y-4">
      <div v-for="provider in providers" :key="provider.id" 
           class="bg-[var(--bg-darker)] p-4 rounded-lg border border-[var(--primary)] border-opacity-50 hover:border-opacity-100 transition-all duration-300 hover:glow-border">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[var(--text-bright)] font-medium">{{ provider.name }}</span>
            <span :class="{
              'px-2 py-0.5 text-xs rounded-full': true,
              'bg-green-900 bg-opacity-20 border border-green-500 text-green-400': provider.status === 'connected',
              'bg-yellow-900 bg-opacity-20 border border-yellow-500 text-yellow-400': provider.status === 'pending',
              'bg-red-900 bg-opacity-20 border border-red-500 text-red-400': provider.status === 'error'
            }">{{ provider.status }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="editProvider(provider)"
              class="text-[var(--primary)] hover:text-[var(--primary-glow)] p-1"
              title="Edit provider"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button 
              @click="deleteProvider(provider)"
              class="text-red-400 hover:text-red-300 p-1"
              title="Delete provider"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <div class="text-[var(--text-dim)] text-sm space-y-1">
          <div class="flex items-center gap-2">
            <span class="flex items-center gap-1">
              <svg v-if="provider.type === 'aws'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.75 11.25H24v1.5h-5.25zm-7.5 0h4.5v1.5h-4.5zM24 15v1.5h-4.5V15zm-12.75 0h1.5v1.5h-1.5zm4.5 0h3v1.5h-3zM24 7.5V9h-8.25V7.5zM11.25 7.5h3V9h-3zM24 18.75h-7.5v-1.5H24zM0 11.25h3.75v1.5H0zm0 3.75h6.75V15H0zm0-7.5h7.5V9H0zm0 11.25h5.25v-1.5H0z"/>
              </svg>
              <svg v-if="provider.type === 'digitalocean'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm0-2.25V18h-3.75v-3.75H4.5V18h3.75v3.75H12zm0-6h-6v-6h6v6z"/>
              </svg>
              <svg v-if="provider.type === 'gcloud'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L2.25 6v12L12 24l9.75-6V6L12 0zm6.75 16.5L12 20.25l-6.75-3.75V7.5L12 3.75l6.75 3.75v9z"/>
              </svg>
              {{ provider.type.toUpperCase() }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            {{ provider.region || 'Default Region' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Provider Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-[var(--bg-dark)] rounded-lg p-6 w-full max-w-md border border-[var(--primary)] glow-border">
        <h3 class="text-xl font-bold text-[var(--primary)] glow-text mb-4">
          {{ editingProvider ? 'Edit Provider' : 'Add Provider' }}
        </h3>
        
        <form @submit.prevent="saveProvider" class="space-y-4">
          <!-- Provider Type -->
          <div>
            <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">Provider Type</label>
            <select 
              v-model="formData.type"
              class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
              :disabled="editingProvider"
            >
              <option value="aws">Amazon Web Services (AWS)</option>
              <option value="digitalocean">DigitalOcean</option>
              <option value="gcloud">Google Cloud</option>
            </select>
          </div>

          <!-- Provider Name -->
          <div>
            <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">Name</label>
            <input 
              v-model="formData.name"
              type="text"
              class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
              placeholder="e.g., AWS Production"
              required
            />
          </div>

          <!-- Region -->
          <div>
            <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">Region</label>
            <input 
              v-model="formData.region"
              type="text"
              class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
              :placeholder="getRegionPlaceholder(formData.type)"
            />
          </div>

          <!-- AWS Credentials -->
          <template v-if="formData.type === 'aws'">
            <div>
              <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">Access Key ID</label>
              <input 
                v-model="formData.credentials.accessKeyId"
                type="text"
                class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
                placeholder="AWS Access Key ID"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">Secret Access Key</label>
              <input 
                v-model="formData.credentials.secretAccessKey"
                type="password"
                class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
                placeholder="AWS Secret Access Key"
                required
              />
            </div>
          </template>

          <!-- DigitalOcean Credentials -->
          <template v-if="formData.type === 'digitalocean'">
            <div>
              <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">API Token</label>
              <input 
                v-model="formData.credentials.apiToken"
                type="password"
                class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
                placeholder="DigitalOcean API Token"
                required
              />
            </div>
          </template>

          <!-- Google Cloud Credentials -->
          <template v-if="formData.type === 'gcloud'">
            <div>
              <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">Project ID</label>
              <input 
                v-model="formData.credentials.projectId"
                type="text"
                class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
                placeholder="Google Cloud Project ID"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--text-bright)] mb-1">
                Service Account Key
                <span class="text-[var(--text-dim)] text-xs">(JSON format)</span>
              </label>
              <textarea 
                v-model="formData.credentials.keyFile"
                rows="4"
                class="w-full px-3 py-2 bg-[var(--bg-darker)] border border-[var(--primary)] border-opacity-50 rounded-md text-[var(--text-bright)] focus:border-opacity-100 transition-all"
                placeholder="Paste your service account key JSON here"
                required
              ></textarea>
            </div>
          </template>

          <!-- Error Message -->
          <div v-if="error" class="bg-[var(--error)] bg-opacity-20 text-[var(--error-glow)] p-3 rounded">
            {{ error }}
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-3 mt-6">
            <button 
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-[var(--primary-dim)] border-opacity-50 rounded-md text-[var(--text-bright)] hover:border-[var(--primary)] hover:border-opacity-100 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-[var(--primary)] bg-opacity-20 border border-[var(--primary)] text-[var(--text-bright)] rounded-md font-medium hover:bg-opacity-30 hover:glow-border transition-all"
              :disabled="isLoading"
            >
              <span class="flex items-center gap-2">
                <svg v-if="isLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isLoading ? 'Saving...' : 'Save Provider' }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-[var(--bg-dark)] rounded-lg p-6 w-full max-w-md border border-red-500 glow-border-red shadow-lg">
        <div class="flex items-center gap-3 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-xl font-bold text-[var(--text-bright)]">Delete Provider</h3>
        </div>

        <p class="text-[var(--text-dim)] mb-2">
          Are you sure you want to delete the provider
        </p>
        <p class="text-[var(--text-bright)] font-semibold mb-6">
          "{{ deletingProvider?.name }}"?
        </p>
        <p class="text-red-400 text-sm mb-6">
          This action cannot be undone.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closeDeleteModal"
            class="px-4 py-2 border border-[var(--primary-dim)] border-opacity-50 rounded-md text-[var(--text-bright)] hover:border-[var(--primary)] hover:border-opacity-100 transition-all"
          >
            Cancel
          </button>
          <button 
            @click="confirmDelete"
            class="px-4 py-2 bg-red-900 bg-opacity-20 border border-red-500 text-red-400 rounded-md font-medium hover:bg-opacity-30 hover:text-red-300 transition-all"
            :disabled="isLoading"
          >
            <span class="flex items-center gap-2">
              <svg v-if="isLoading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading ? 'Deleting...' : 'Delete Provider' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const providers = ref([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const isLoading = ref(false);
const error = ref('');
const editingProvider = ref(null);
const deletingProvider = ref(null);

const formData = ref({
  type: 'aws',
  name: '',
  region: '',
  credentials: {
    accessKeyId: '',
    secretAccessKey: '',
    apiToken: '',
    projectId: '',
    keyFile: ''
  }
});

const getRegionPlaceholder = (type) => {
  switch (type) {
    case 'aws':
      return 'e.g., us-east-1';
    case 'digitalocean':
      return 'e.g., nyc1';
    case 'gcloud':
      return 'e.g., us-central1-a';
    default:
      return 'Enter region';
  }
};

const resetForm = () => {
  formData.value = {
    type: 'aws',
    name: '',
    region: '',
    credentials: {
      accessKeyId: '',
      secretAccessKey: '',
      apiToken: '',
      projectId: '',
      keyFile: ''
    }
  };
  error.value = '';
};

const addProvider = () => {
  editingProvider.value = null;
  resetForm();
  showModal.value = true;
};

const editProvider = (provider) => {
  editingProvider.value = provider;
  formData.value = {
    type: provider.type,
    name: provider.name,
    region: provider.region,
    credentials: { ...provider.credentials }
  };
  showModal.value = true;
};

const deleteProvider = (provider) => {
  deletingProvider.value = provider;
  showDeleteModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deletingProvider.value = null;
};

const saveProvider = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    const endpoint = editingProvider.value 
      ? `/api/cloud/${editingProvider.value.id}`
      : '/api/cloud';
    
    const response = await fetch(endpoint, {
      method: editingProvider.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData.value)
    });

    const data = await response.json();

    if (response.ok) {
      await loadProviders();
      closeModal();
    } else {
      error.value = data.error || 'Failed to save provider';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

const confirmDelete = async () => {
  if (!deletingProvider.value) return;

  isLoading.value = true;
  try {
    const response = await fetch(`/api/cloud/${deletingProvider.value.id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      await loadProviders();
      closeDeleteModal();
    } else {
      const data = await response.json();
      error.value = data.error || 'Failed to delete provider';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

const loadProviders = async () => {
  try {
    const response = await fetch('/api/cloud');
    const data = await response.json();
    providers.value = data.providers || [];
  } catch (error) {
    console.error('Error loading providers:', error);
  }
};

onMounted(() => {
  loadProviders();
});
</script>