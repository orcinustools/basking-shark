const AWSProvider = require('./aws');
const DigitalOceanProvider = require('./digitalocean');
const GCloudProvider = require('./gcloud');

class CloudProviderFactory {
  static createProvider(type, config) {
    switch (type.toLowerCase()) {
      case 'aws':
        return new AWSProvider(config);
      case 'digitalocean':
        return new DigitalOceanProvider(config);
      case 'gcloud':
        return new GCloudProvider(config);
      default:
        throw new Error(`Unsupported cloud provider: ${type}`);
    }
  }
}

module.exports = {
  CloudProviderFactory,
  AWSProvider,
  DigitalOceanProvider,
  GCloudProvider
};