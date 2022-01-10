import { StackProps } from 'aws-cdk-lib';

export interface WebhookEnvironment {
  templateId: string;
  templateVersion: string;
  clusterName: string;
  clusterArn: string;
  taskDefinition: string;
  subnets: string;
  securityGroup: string;
}

export interface GithubActionsRunnersProps extends StackProps {
  runnerTimeout?: string;
  context: string;
  tokenSsmPath: string;
  runnerVersion?: string;
  vm?: {
    enableEc2InstanceConnect?: boolean;
  };
}
