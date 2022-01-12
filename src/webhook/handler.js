/* eslint-disable import/no-unresolved */
const AWS = require('aws-sdk');
const crypto = require('crypto');

const ec2 = new AWS.EC2();
const ec2Params = {
  MinCount: 1,
  MaxCount: 1,
  LaunchTemplate: {
    LaunchTemplateId: process.env.templateId,
    Version: process.env.templateVersion,
  },
  SubnetId: process.env.subnetId,
};

if (process.env.spot === 'true') {
  ec2Params.InstanceMarketOptions = {
    MarketType: 'spot',
    SpotOptions: {
      SpotInstanceType: 'one-time',
    },
  };
}

const ssm = new AWS.SSM();
const ssmParams = {
  Names: [process.env.webhookSecretSsmPath],
  WithDecryption: true,
};

const verifySignature = async event => {
  const ssmResult = await ssm.getParameters(ssmParams).promise();
  const sig = Buffer.from(event.headers['X-Hub-Signature-256'], 'utf8');
  const hmac = crypto.createHmac('sha256', ssmResult.Parameters[0].Value);
  const digest = Buffer.from(
    `sha256=${hmac.update(event.body).digest('hex')}`,
    'utf8',
  );
  return sig.length === digest.length && crypto.timingSafeEqual(digest, sig);
};

const supportedRepo = repo => repo.includes(process.env.context);

const handler = async event => {
  try {
    const data = JSON.parse(event.body);
    const vm = data.workflow_job.labels.find(x => x.match(/vm:.*/));
    if (
      (await verifySignature(event)) &&
      data.workflow_job &&
      data.action === 'queued' &&
      vm &&
      supportedRepo(data.repository.full_name)
    ) {
      console.log('Launching EC2 instance.');
      await ec2
        .runInstances({
          ...ec2Params,
          InstanceType: vm.split(':')[1],
        })
        .promise();
      console.log('EC2 instance launched.');
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
