#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { GithubActionsRunners } from '../src';

const app = new App();
new GithubActionsRunners(app, 'GithubActionsRunnerStack', {
  env: {
    account: '466464767973',
    region: 'eu-north-1',
  },
  vm: {
    enableEc2InstanceConnect: true,
  },
  runnerGroup: 'labs',
  context: 'spt-mediaplatform-labs',
  tokenSsmPath: '/github/actions/token',
});
