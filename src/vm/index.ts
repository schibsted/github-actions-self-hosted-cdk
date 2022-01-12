import { Stack } from 'aws-cdk-lib';
import {
  InstanceInitiatedShutdownBehavior,
  InstanceType,
  UserData,
  MachineImage,
  LaunchTemplate,
  ISecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import {
  PolicyStatement,
  Role,
  ServicePrincipal,
  PolicyDocument,
  CfnInstanceProfile,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import {
  CfnImage,
  CfnImageRecipe,
  CfnInfrastructureConfiguration,
  CfnComponent,
} from 'aws-cdk-lib/aws-imagebuilder';
import { readFileSync } from 'fs';
import path from 'path';
import { GithubActionsRunnersProps } from '../types';

export const setupVMRunners = (
  stack: Stack,
  props: GithubActionsRunnersProps,
  securityGroup: ISecurityGroup,
) => {
  const region = props.env?.region ?? 'eu-north-1';

  const component = new CfnComponent(stack, 'GithubActionsRunnerComponent', {
    name: 'Install Runner',
    version: '1.0.2',
    platform: 'Linux',
    data: readFileSync(path.resolve(__dirname, './component.yml'), 'utf8'),
  });

  const recipe = new CfnImageRecipe(stack, 'Recipe', {
    name: 'GithubActionsRunnerAmiRecipe',
    version: '0.0.4',
    parentImage: `arn:aws:imagebuilder:${region}:aws:image/ubuntu-server-20-lts-x86/x.x.x`,
    components: [
      {
        componentArn: `arn:aws:imagebuilder:${region}:aws:component/update-linux/1.0.0`,
      },
      {
        componentArn: `arn:aws:imagebuilder:${region}:aws:component/docker-ce-ubuntu/1.0.0`,
      },
      {
        componentArn: component.attrArn,
        parameters: [
          {
            name: 'RunnerVersion',
            value: ['2.286.0'],
          },
        ],
      },
    ],
  });

  const instanceProfile = new CfnInstanceProfile(stack, 'AmiInstanceProfile', {
    path: '/executionServiceEC2Role/',
    instanceProfileName: 'GithubActionsRunnerInstanceProfile',
    roles: [
      new Role(stack, 'InstanceProfileRole', {
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'AmazonSSMManagedInstanceCore',
          ),
          ManagedPolicy.fromAwsManagedPolicyName(
            'EC2InstanceProfileForImageBuilder',
          ),
        ],
      }).roleName,
    ],
  });

  const infraConfig = new CfnInfrastructureConfiguration(
    stack,
    'AmiInfraConfig',
    {
      name: 'GithubActionsRunnerAmiInfraConfig',
      instanceProfileName: instanceProfile.instanceProfileName!,
    },
  );
  infraConfig.addDependsOn(instanceProfile);

  const ami = new CfnImage(stack, 'Ami', {
    imageRecipeArn: recipe.attrArn,
    infrastructureConfigurationArn: infraConfig.attrArn,
  });

  const userDataScript = readFileSync(
    path.resolve(__dirname, './entrypoint.sh'),
    'utf8',
  )
    .replace('$AWS_REGION', region)
    .replace('$GH_TOKEN_SSM_PATH', props.tokenSsmPath)
    .replace('$RUNNER_CONTEXT', props.context)
    .replace('$RUNNER_GROUP', props.runnerGroup ?? 'default')
    .replace('$RUNNER_TIMEOUT', props.runnerTimeout ?? '60m');
  const template = new LaunchTemplate(stack, 'LaunchTemplate', {
    launchTemplateName: 'GithubActionsRunnerTemplate',
    userData: UserData.custom(userDataScript),
    instanceType: new InstanceType('t3.micro'),
    machineImage: MachineImage.genericLinux({
      [region]: ami.attrImageId,
    }),
    instanceInitiatedShutdownBehavior:
      InstanceInitiatedShutdownBehavior.TERMINATE,
    securityGroup,
    role: new Role(stack, 'RunnerRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      inlinePolicies: {
        'ssm-policy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['ssm:*'],
              resources: ['*'],
            }),
          ],
        }),
      },
    }),
  });

  return {
    templateId: template.launchTemplateId ?? '',
    templateVersion: template.latestVersionNumber,
  };
};
