const AWS = require('aws-sdk');

class AWSProvider {
  constructor(config) {
    this.config = config;
    this.ec2 = new AWS.EC2({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || 'us-east-1'
    });
  }

  async listInstances() {
    try {
      const data = await this.ec2.describeInstances().promise();
      const instances = [];
      
      data.Reservations.forEach(reservation => {
        reservation.Instances.forEach(instance => {
          instances.push({
            id: instance.InstanceId,
            type: instance.InstanceType,
            state: instance.State.Name,
            publicIp: instance.PublicIpAddress,
            privateIp: instance.PrivateIpAddress,
            name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed',
            platform: instance.Platform || 'linux'
          });
        });
      });
      
      return instances;
    } catch (error) {
      throw new Error(`Failed to list EC2 instances: ${error.message}`);
    }
  }

  async startInstance(instanceId) {
    try {
      await this.ec2.startInstances({
        InstanceIds: [instanceId]
      }).promise();
      return { message: `Started instance ${instanceId}` };
    } catch (error) {
      throw new Error(`Failed to start instance: ${error.message}`);
    }
  }

  async stopInstance(instanceId) {
    try {
      await this.ec2.stopInstances({
        InstanceIds: [instanceId]
      }).promise();
      return { message: `Stopped instance ${instanceId}` };
    } catch (error) {
      throw new Error(`Failed to stop instance: ${error.message}`);
    }
  }

  async createInstance(params) {
    try {
      const data = await this.ec2.runInstances({
        ImageId: params.imageId,
        InstanceType: params.instanceType || 't2.micro',
        MinCount: 1,
        MaxCount: 1,
        KeyName: params.keyName,
        SecurityGroupIds: params.securityGroupIds,
        TagSpecifications: [{
          ResourceType: 'instance',
          Tags: [{ Key: 'Name', Value: params.name }]
        }]
      }).promise();
      
      return {
        instanceId: data.Instances[0].InstanceId,
        message: `Created instance ${data.Instances[0].InstanceId}`
      };
    } catch (error) {
      throw new Error(`Failed to create instance: ${error.message}`);
    }
  }

  async terminateInstance(instanceId) {
    try {
      await this.ec2.terminateInstances({
        InstanceIds: [instanceId]
      }).promise();
      return { message: `Terminated instance ${instanceId}` };
    } catch (error) {
      throw new Error(`Failed to terminate instance: ${error.message}`);
    }
  }
}

module.exports = AWSProvider;