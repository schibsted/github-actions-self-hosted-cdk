#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { GithubActionsRunnerStack } from '../lib';

const app = new App();
new GithubActionsRunnerStack(app, 'GithubActionsRunnerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
