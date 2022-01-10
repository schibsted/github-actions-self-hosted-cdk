import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GithubActionsRunnerStack } from '../src/index';

test('Snapshot test', () => {
  const stack = new GithubActionsRunnerStack(new Stack(), 'TestStack', {
    env: {
      account: 'abc-123',
      region: 'eu-north-1',
    },
    context: 'spt-mediaplatform-labs',
    tokenSsmPath: '/github/actions/token',
  });
  expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
});
