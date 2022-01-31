import { StackProps } from 'aws-cdk-lib';

export interface WebhookEnvironment {
  templateId: string;
  templateVersion: string;
  scope: string;
  subnetId: string;
  spot: string;
  webhookSecretSsmPath: string;
  webhookSecretSsmArn: string;
}

export interface Domain {
  name: string;
  hostedZoneDomain: string;
}

export interface Context {
  name: string;
  scope: string;
  webhookSecretSsmPath: string;
  tokenSsmPath: string;
  group?: string;
  timeout?: string;
  spot?: boolean;
}

export interface GithubActionsRunnersProps extends StackProps {
  runnerVersion?: string;
  debugMode?: boolean;
  privateSubnets?: boolean;
  contexts?: Context[];
  domain?: Domain;
}
