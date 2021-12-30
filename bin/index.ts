#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { GithubActionsRunnerStack } from '../lib';

const app = new App();
new GithubActionsRunnerStack(app, 'GithubActionsRunnerStack', {
  env: {
    account: '466464767973',
    region: 'eu-north-1',
  },
  context: 'spt-mediaplatform-labs',
  tokenSsmPath: '/github/actions/token',
});
