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
    contexts: [
      {
        name: 'Labs1',
        scope: 'spt-mediaplatform-labs',
        spot: true,
        webhookSecretSsmPath: '/github/webhook/secret',
        tokenSsmPath: '/github/actions/token',
        timeout: '10m',
      },
      {
        name: 'Labs2',
        scope: 'spt-mediaplatform-another-labs',
        spot: false,
        webhookSecretSsmPath: '/github/webhook/another-secret',
        tokenSsmPath: '/github/actions/token',
        timeout: '30m',
      },
    ],
  });
  expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});
