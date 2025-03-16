const { Compute } = require('@google-cloud/compute');

class GCloudProvider {
  constructor(config) {
    this.config = config;
    this.compute = new Compute({
      projectId: config.projectId,
      keyFilename: config.keyFilePath
    });
  }

  async listInstances(zone = 'us-central1-a') {
    try {
      const [vms] = await this.compute.getVMs({ filter: `zone eq ${zone}` });
      return vms.map(vm => ({
        id: vm.id,
        name: vm.name,
        zone: vm.zone.id,
        machineType: vm.machineType,
        status: vm.metadata.status,
        networkInterfaces: vm.networkInterfaces,
        created: vm.metadata.creationTimestamp
      }));
    } catch (error) {
      throw new Error(`Failed to list instances: ${error.message}`);
    }
  }

  async createInstance(params) {
    try {
      const zone = this.compute.zone(params.zone || 'us-central1-a');
      const [vm, operation] = await zone.createVM(params.name, {
        os: params.os || 'ubuntu-2004-lts',
        http: true,
        machineType: params.machineType || 'n1-standard-1',
        tags: params.tags || []
      });

      await operation.promise();
      
      return {
        instanceId: vm.id,
        name: vm.name,
        message: `Created instance ${vm.name}`
      };
    } catch (error) {
      throw new Error(`Failed to create instance: ${error.message}`);
    }
  }

  async startInstance(name, zone = 'us-central1-a') {
    try {
      const vm = this.compute.zone(zone).vm(name);
      const [operation] = await vm.start();
      await operation.promise();
      return { message: `Started instance ${name}` };
    } catch (error) {
      throw new Error(`Failed to start instance: ${error.message}`);
    }
  }

  async stopInstance(name, zone = 'us-central1-a') {
    try {
      const vm = this.compute.zone(zone).vm(name);
      const [operation] = await vm.stop();
      await operation.promise();
      return { message: `Stopped instance ${name}` };
    } catch (error) {
      throw new Error(`Failed to stop instance: ${error.message}`);
    }
  }

  async deleteInstance(name, zone = 'us-central1-a') {
    try {
      const vm = this.compute.zone(zone).vm(name);
      const [operation] = await vm.delete();
      await operation.promise();
      return { message: `Deleted instance ${name}` };
    } catch (error) {
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
  }

  async createSnapshot(diskName, snapshotName, zone = 'us-central1-a') {
    try {
      const disk = this.compute.zone(zone).disk(diskName);
      const [snapshot] = await disk.createSnapshot(snapshotName);
      return {
        id: snapshot.id,
        name: snapshot.name,
        message: `Created snapshot ${snapshotName}`
      };
    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }
  }
}

module.exports = GCloudProvider;