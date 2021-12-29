/* eslint-disable-next-line import/no-unresolved */
const AWS = require('aws-sdk');

const handler = async event => {
  const data = JSON.parse(event.body);
  if (data.workflow_job && data.action === 'queued') {
    const ecs = new AWS.ECS({
      region: 'eu-north-1',
    });
    const params = {
      cluster:
        'GithubActionsRunnerStack-GitHubActionsRunnerCluster5CD8DD12-K5Vb7u6RuoaN',
      taskDefinition:
        'GithubActionsRunnerStackGitHubActionsRunnerTaskDefinitionC7A2B72D',
      capacityProviderStrategy: [
        {
          capacityProvider: 'GitHubActionsRunnerCapacityProvider',
        },
      ],
      count: 1,
    };
    try {
      console.log('Launching new task...');
      await ecs.runTask(params).promise();
      console.log('Task launched.');
    } catch (e) {
      console.error(e);
    }
  }
  console.log('event', event);
  return {
    body: JSON.stringify({
      status: 'ok',
    }),
    statusCode: 200,
  };
};

module.exports = { handler };
