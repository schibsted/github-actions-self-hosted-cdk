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

const handler = async event => {
  try {
    const data = JSON.parse(event.body);
    console.log('Data', data);

    if (data.workflow_job && data.action === 'queued') {
      if (data.workflow_job.labels.includes('vm')) {
        const instanceType = data.workflow_job.labels.find(x => x.match(/instance-type:.+/)).split(':')[1];
        const params = instanceType
          ? { ...ec2Params, InstanceType: instanceType }
          : ec2Params;
        console.log('Launching vm runner with params', params);
        await ec2.runInstances(params).promise();
        console.log('Vm runner launched.');
      } else if (data.workflow_job.labels.includes('container')) {
        console.log('Launching container runner');
      } else {
        console.log('Launching new default runner...');
        await ec2.runInstances(ec2Params).promise();
        console.log('Default runner launched.');
      }

      // console.log('Launching new runner...');
      // await ec2.runInstances(ec2Params).promise();
      // console.log('Runner launched.');

      // console.log('Launching new task...');
      // await ecs.runTask(ecsParams).promise();
      // console.log('Task launched.');
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
