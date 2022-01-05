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
    if (data.workflow_job && data.action === 'queued') {
      if(data.workflow_job.labels.includes('vm')) {
        console.log('Launching vm runner');
      } else if(data.workflow_job.labels.includes('container')) {
        console.log('Launching container runner');
      }

      console.log('Data', data);

      console.log('Launching new runner...');
      await ec2.runInstances(ec2Params).promise();
      console.log('Runner launched.');

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
