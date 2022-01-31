import { Stack } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Policy } from 'aws-cdk-lib/aws-iam';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
import path from 'path';
import { WebhookEnvironment, Context, Domain } from '../types';

export const setupApiGateway = (stack: Stack, domain?: Domain) => {
  const gateway = new RestApi(stack, `${stack.artifactId}/WebhookApiGateway`);
  if (domain) {
    const hostedZone = HostedZone.fromLookup(stack, 'HostedZone', {
      domainName: domain.hostedZoneDomain,
    });
    const certificate = new DnsValidatedCertificate(stack, 'Certificate', {
      domainName: domain.name,
      hostedZone,
    });
    gateway.addDomainName('DomainName', {
      domainName: domain.name,
      certificate,
    });
    new ARecord(stack, `AliasRecord${domain.name}`, {
      zone: hostedZone,
      recordName: domain.name,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(gateway.domainName!)),
    });
  }
  return gateway;
};

export const setupWekhook = (
  stack: Stack,
  context: Context,
  gateway: RestApi,
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

  const orgrepo = context.scope.split('/');
  const resource =
    orgrepo.length > 1
      ? gateway.root.addResource(orgrepo[0]).addResource(orgrepo[1])
      : gateway.root.addResource(orgrepo[0]);
  resource.addMethod('POST', new LambdaIntegration(func));

  return {
    url: gateway.url,
    stage: gateway.deploymentStage,
    domain: gateway.domainName,
  };
};
