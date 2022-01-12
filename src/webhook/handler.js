/* eslint-disable-next-line import/no-unresolved */
const AWS = require('aws-sdk');

const ec2 = new AWS.EC2();
const ec2Params = {
  MinCount: 1,
  MaxCount: 1,
  LaunchTemplate: {
    LaunchTemplateId: process.env.templateId,
    Version: process.env.templateVersion,
  },
};

const supportedRepo = repo => repo.includes(process.env.context);

const handler = async event => {
  try {
    const data = JSON.parse(event.body);
    console.log('Data', data);
    if (
      data.workflow_job &&
      data.action === 'queued' &&
      supportedRepo(data.repository.full_name)
    ) {
      const vm = data.workflow_job.labels.find(x => x.match(/vm:.*/));
      if (vm) {
        console.log('Launching vm runner');
        await ec2
          .runInstances({
            ...ec2Params,
            InstanceType: vm.split(':')[1],
          })
          .promise();
        console.log('Vm runner launched.');
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
