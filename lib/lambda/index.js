/* eslint-disable-next-line import/no-unresolved */
const AWS = require('aws-sdk');

const ecs = new AWS.ECS();
const ec2 = new AWS.EC2();
const ecsParams = {
  cluster: process.env.cluster,
  taskDefinition: process.env.taskDefinition,
  capacityProviderStrategy: [
    {
      capacityProvider: process.env.capacityProvider,
    },
  ],
  count: 1,
};
const ec2Params = {
  MinCount: 1,
  MaxCount: 1,
  LaunchTemplate: {
    LaunchTemplateId: process.env.templateId,
    Version: process.env.templateVersion,
  },
};

const supportedContainerMemory = [512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192];
const containerCpuMapping = {
  512: 256,
  1024: 512,
  2048: 1024,
  3072: 1024,
  4096: 2048,
  5120: 2048,
  6144: 2048,
  7168: 2048,
  8192: 4096,
};

const handler = async event => {
  try {
    const data = JSON.parse(event.body);
    console.log('Data', data);
    if (data.workflow_job && data.action === 'queued') {
      const vm = data.workflow_job.labels.find(x => x.match(/vm:.*/));
      const container = data.workflow_job.labels.find(x => x.match(/container:.*/));
      if(vm) {
        console.log('Launching vm runner');
        await ec2.runInstances({
          ...ec2Params,
          InstanceType: vm.split(':')[1],
        }).promise();
        console.log('Vm runner launched.');
      } else if(container) {
        const memory = container.split(':')[1];
        if(supportedContainerMemory(memory)) {
          console.log('Launching container runner');
        } else {
          console.log(`Unsupported container memory: ${memory}`);
        }
      } else {
        console.log('Invalid runner config.');
      }
    }
    return {
      statusCode: 200,
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
    };
  }
};

module.exports = { handler };
