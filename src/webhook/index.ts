import { Stack } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Policy } from 'aws-cdk-lib/aws-iam';
import path from 'path';
import { WebhookEnvironment } from '../types';

export const setupWekhook = (stack: Stack, env: WebhookEnvironment) => {
  const func = new Function(stack, 'WebhookLambda', {
    runtime: Runtime.NODEJS_14_X,
    handler: 'handler.handler',
    code: Code.fromAsset(path.join(__dirname, '.')),
    environment: {
      ...env,
    },
  });
  func.role?.attachInlinePolicy(
    new Policy(stack, 'LaunchGithubActionsRunner', {
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
  const api = new RestApi(stack, `${stack.artifactId}/WebhookApiGateway`);
  const resource = api.root.addResource('webhook');
  resource.addMethod('POST', new LambdaIntegration(func));
};
