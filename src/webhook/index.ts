import { Stack } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Policy } from 'aws-cdk-lib/aws-iam';
import path from 'path';
import { WebhookEnvironment, Context } from '../types';

export const setupWekhook = (
  stack: Stack,
  context: Context,
  env: WebhookEnvironment,
) => {
  const func = new Function(stack, `WebhookLambda${context.name}`, {
    runtime: Runtime.NODEJS_14_X,
    handler: 'handler.handler',
    code: Code.fromAsset(path.join(__dirname, '.')),
    environment: {
      ...env,
    },
  });
  func.role?.attachInlinePolicy(
    new Policy(stack, `LaunchGithubActionsRunner${context.name}`, {
      statements: [
        new PolicyStatement({
          actions: ['ec2:RunInstances', 'ec2:CreateTags'],
          resources: ['*'],
        }),
        new PolicyStatement({
          actions: ['iam:PassRole'],
          resources: ['*'],
          conditions: {
            StringLike: {
              'iam:PassedToService': 'ec2.amazonaws.com',
            },
          },
        }),
        new PolicyStatement({
          actions: ['ssm:getParameters'],
          resources: [env.webhookSecretSsmArn],
        }),
        new PolicyStatement({
          actions: ['iam:PassRole'],
          resources: ['*'],
          conditions: {
            StringLike: {
              'iam:PassedToService': 'ssm.amazonaws.com',
            },
          },
        }),
      ],
    }),
  );
  const api = new RestApi(
    stack,
    `${stack.artifactId}/${context.name}/WebhookApiGateway`,
  );
  const resource = api.root.addResource('webhook');
  resource.addMethod('POST', new LambdaIntegration(func));

  return {
    url: api.url,
    stage: api.deploymentStage,
  };
};
