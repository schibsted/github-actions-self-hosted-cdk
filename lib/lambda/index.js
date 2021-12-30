/* eslint-disable-next-line import/no-unresolved */
const AWS = require('aws-sdk');

const ecs = new AWS.ECS();
const params = {
  cluster: process.env.cluster,
  taskDefinition: process.env.taskDefinition,
  capacityProviderStrategy: [
    {
      capacityProvider: process.env.capacityProvider,
    },
  ],
  count: 1,
};

const handler = async event => {
  try {
    const data = JSON.parse(event.body);
    if (data.workflow_job && data.action === 'queued') {
      console.log('Launching new task...');
      await ecs.runTask(params).promise();
      console.log('Task launched.');
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
