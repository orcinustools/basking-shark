const axios = require('axios');

class DigitalOceanProvider {
  constructor(config) {
    this.config = config;
    this.api = axios.create({
      baseURL: 'https://api.digitalocean.com/v2',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listDroplets() {
    try {
      const response = await this.api.get('/droplets');
      return response.data.droplets.map(droplet => ({
        id: droplet.id,
        name: droplet.name,
        status: droplet.status,
        size: droplet.size_slug,
        region: droplet.region.slug,
        ipv4: droplet.networks.v4.find(n => n.type === 'public')?.ip_address,
        created: droplet.created_at
      }));
    } catch (error) {
      throw new Error(`Failed to list droplets: ${error.message}`);
    }
  }

  async createDroplet(params) {
    try {
      const response = await this.api.post('/droplets', {
        name: params.name,
        region: params.region || 'nyc1',
        size: params.size || 's-1vcpu-1gb',
        image: params.image || 'ubuntu-20-04-x64',
        ssh_keys: params.sshKeys,
        backups: params.backups || false,
        ipv6: params.ipv6 || false,
        monitoring: params.monitoring || true,
        tags: params.tags || []
      });
      
      return {
        dropletId: response.data.droplet.id,
        message: `Created droplet ${response.data.droplet.name}`
      };
    } catch (error) {
      throw new Error(`Failed to create droplet: ${error.message}`);
    }
  }

  async deleteDroplet(dropletId) {
    try {
      await this.api.delete(`/droplets/${dropletId}`);
      return { message: `Deleted droplet ${dropletId}` };
    } catch (error) {
      throw new Error(`Failed to delete droplet: ${error.message}`);
    }
  }

  async powerOnDroplet(dropletId) {
    try {
      await this.api.post(`/droplets/${dropletId}/actions`, {
        type: 'power_on'
      });
      return { message: `Powered on droplet ${dropletId}` };
    } catch (error) {
      throw new Error(`Failed to power on droplet: ${error.message}`);
    }
  }

  async powerOffDroplet(dropletId) {
    try {
      await this.api.post(`/droplets/${dropletId}/actions`, {
        type: 'power_off'
      });
      return { message: `Powered off droplet ${dropletId}` };
    } catch (error) {
      throw new Error(`Failed to power off droplet: ${error.message}`);
    }
  }

  async getDropletSnapshots(dropletId) {
    try {
      const response = await this.api.get(`/droplets/${dropletId}/snapshots`);
      return response.data.snapshots.map(snapshot => ({
        id: snapshot.id,
        name: snapshot.name,
        created: snapshot.created_at,
        size: snapshot.size_gigabytes
      }));
    } catch (error) {
      throw new Error(`Failed to get droplet snapshots: ${error.message}`);
    }
  }
}

module.exports = DigitalOceanProvider;