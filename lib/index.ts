import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import path = require('path');
import { FargatePlatformVersion } from 'aws-cdk-lib/aws-ecs';

export class GithubActionsRunnerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'GitHubActionsRunnerVpc', {
      maxAzs: 1, // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, 'GitHubActionsRunnerCluster', {
      vpc,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'GitHubActionsRunnerTaskDefinition',
    );

    taskDefinition.addContainer('GitHubActionsRunnerContainer', {
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../image')),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
      secrets: {
        GITHUB_ACCESS_TOKEN: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubAccessToken',
            {
              parameterName: 'GITHUB_ACCESS_TOKEN',
              version: 0,
            },
          ),
        ),
        GITHUB_ACTIONS_RUNNER_CONTEXT: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubActionsRunnerContext',
            {
              parameterName: 'GITHUB_ACTIONS_RUNNER_CONTEXT',
              version: 0,
            },
          ),
        ),
      },
    });

    new ecs.FargateService(this, 'GitHubActionsRunnerService', {
      cluster,
      taskDefinition,
      platformVersion: FargatePlatformVersion.VERSION1_4,
    });
  }
}
