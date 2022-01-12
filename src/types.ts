import { StackProps } from 'aws-cdk-lib';

export interface WebhookEnvironment {
  templateId: string;
  templateVersion: string;
  context: string;
  webhookSecretSsmPath: string;
  webhookSecretSsmArn: string;
}

export interface GithubActionsRunnersProps extends StackProps {
  runnerTimeout?: string;
  context: string;
  tokenSsmPath: string;
  webhookSecretSsmPath: string;
  runnerVersion?: string;
  runnerGroup?: string;
  vm?: {
    enableEc2InstanceConnect?: boolean;
  };
}
