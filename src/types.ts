import { StackProps } from 'aws-cdk-lib';

export interface WebhookEnvironment {
  templateId: string;
  templateVersion: string;
  context: string;
}

export interface GithubActionsRunnersProps extends StackProps {
  runnerTimeout?: string;
  context: string;
  tokenSsmPath: string;
  runnerVersion?: string;
  runnerGroup?: string;
  vm?: {
    enableEc2InstanceConnect?: boolean;
  };
}
