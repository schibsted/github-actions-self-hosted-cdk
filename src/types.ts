import { StackProps } from 'aws-cdk-lib';

export interface WebhookEnvironment {
  templateId: string;
  templateVersion: string;
  context: string;
  subnetId: string;
  spot: string;
  webhookSecretSsmPath: string;
  webhookSecretSsmArn: string;
}

export interface Context {
  name: string;
  scope: string;
  group?: string;
  timeout?: string;
  spot?: boolean;
  webhookSecretSsmPath: string;
}

export interface GithubActionsRunnersProps extends StackProps {
  tokenSsmPath: string;
  runnerVersion?: string;
  debugMode?: boolean;
  private?: boolean;
  contexts?: Context[];
}
