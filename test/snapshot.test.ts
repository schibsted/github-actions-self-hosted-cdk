import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GithubActionsRunners } from '../src/index';

test('Snapshot test', () => {
  const stack = new GithubActionsRunners(new Stack(), 'TestStack', {
    env: {
      account: 'abc-123',
      region: 'eu-north-1',
    },
    privateSubnets: true,
    githubHost: 'github.example.com',
    contexts: [
      {
        name: 'MyOrg',
        scope: 'my-org',
        spot: true,
        webhookSecretSsmPath: '/github/webhook/secret',
        tokenSsmPath: '/github/actions/token',
        timeout: '10m',
      },
      {
        name: 'SomeOrgMyRepo',
        scope: 'some-other-org/my-repo',
        spot: false,
        webhookSecretSsmPath: '/github/webhook/another-secret',
        tokenSsmPath: '/github/actions/another-token',
        timeout: '30m',
      },
    ],
  });
  expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});
