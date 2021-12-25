import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  LogDrivers,
  Secret,
  FargateService,
  FargatePlatformVersion,
} from 'aws-cdk-lib/aws-ecs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import path from 'path';

export class GithubActionsRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'GitHubActionsRunnerVpc', {
      maxAzs: 1, // Default is all AZs in region
    });

    const cluster = new Cluster(this, 'GitHubActionsRunnerCluster', {
      vpc,
    });

    const taskDefinition = new FargateTaskDefinition(
      this,
      'GitHubActionsRunnerTaskDefinition',
    );

    taskDefinition.addContainer('GitHubActionsRunnerContainer', {
      image: ContainerImage.fromAsset(path.resolve(__dirname, '../image')),
      logging: LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
      secrets: {
        GITHUB_ACCESS_TOKEN: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubAccessToken',
            {
              parameterName: 'GITHUB_ACCESS_TOKEN',
              version: 0,
            },
          ),
        ),
        GITHUB_ACTIONS_RUNNER_CONTEXT: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
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

    new FargateService(this, 'GitHubActionsRunnerService', {
      cluster,
      taskDefinition,
      platformVersion: FargatePlatformVersion.VERSION1_4,
    });
  }
}
