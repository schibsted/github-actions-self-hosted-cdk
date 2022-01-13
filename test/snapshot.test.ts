import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GithubActionsRunners } from '../src/index';

test('Snapshot test', () => {
  const stack = new GithubActionsRunners(new Stack(), 'TestStack', {
    env: {
      account: 'abc-123',
      region: 'eu-north-1',
    },
    vm: {
      enableEc2InstanceConnect: true,
    },
    context: 'spt-mediaplatform-labs',
    tokenSsmPath: '/github/actions/token',
    webhookSecretSsmPath: '/github/webhook/secret',
    private: true,
  });
  expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});
