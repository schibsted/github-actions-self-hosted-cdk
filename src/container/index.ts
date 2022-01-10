import { Stack } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  LogDrivers,
  Secret,
} from 'aws-cdk-lib/aws-ecs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import path from 'path';
import { GithubActionsRunnerParams } from '../types';

export const setupContainerRunners = (
  stack: Stack,
  props: GithubActionsRunnerParams,
  vpc: IVpc,
) => {
  const cluster = new Cluster(stack, 'GitHubActionsRunnerCluster', {
    vpc,
    enableFargateCapacityProviders: true,
    clusterName: 'GitHubActionsRunnerCluster',
  });

  const taskDefinition = new FargateTaskDefinition(stack, 'TaskDef', {});
  taskDefinition.addContainer('Container', {
    containerName: 'Runner',
    image: ContainerImage.fromAsset(path.resolve(__dirname, '.')),
    logging: LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
    environment: {
      RUNNER_CONTEXT: props.context,
      RUNNER_TIMEOUT: props.runnerTimeout ?? '60m',
    },
    secrets: {
      GITHUB_TOKEN: Secret.fromSsmParameter(
        StringParameter.fromSecureStringParameterAttributes(
          stack,
          'GitHubAccessToken',
          {
            parameterName: props.tokenSsmPath,
            version: 0,
          },
        ),
      ),
    },
  });

  return {
    clusterName: cluster.clusterName,
    clusterArn: cluster.clusterArn,
    taskDefinition: taskDefinition.family,
  };
};
