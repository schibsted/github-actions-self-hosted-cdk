import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc, SubnetType, InstanceType } from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  LogDrivers,
  Secret,
  FargateService,
  FargatePlatformVersion,
  EcsOptimizedImage,
  AsgCapacityProvider,
  Ec2TaskDefinition,
  Ec2Service,
  ContainerDefinition,
} from 'aws-cdk-lib/aws-ecs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import path from 'path';

export class GithubActionsRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    const autoScalingGroup = new AutoScalingGroup(this, 'Asg', {
      vpc,
      machineImage: EcsOptimizedImage.amazonLinux2(),
      instanceType: new InstanceType('t3.micro'),
      minCapacity: 0,
      maxCapacity: 10,
    });

    const capacityProvider = new AsgCapacityProvider(
      this,
      'AsgCapacityProvider',
      {
        autoScalingGroup,
        enableManagedTerminationProtection: false,
        capacityProviderName: 'GitHubActionsRunnerCapacityProvider',
      },
    );

    const cluster = new Cluster(this, 'GitHubActionsRunnerCluster', {
      vpc,
    });

    cluster.addAsgCapacityProvider(capacityProvider);

    const taskDefinition = new Ec2TaskDefinition(
      this,
      'GitHubActionsRunnerTaskDefinition',
    );

    const container = new ContainerDefinition(this, 'Container', {
      image: ContainerImage.fromAsset(path.resolve(__dirname, '../image')),
      logging: LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
      memoryReservationMiB: 512,
      taskDefinition,
    });

    // taskDefinition.addVolume({
    //   name: 'docker_dock',
    //   host: {
    //     sourcePath: '/var/run/docker.sock',
    //   }
    // });

    // container.addMountPoints({
    //   containerPath: '/var/run/docker.sock',
    //   sourceVolume: 'docker_sock',
    //   readOnly: true,
    // });

    new Ec2Service(this, 'Service', {
      serviceName: 'GitHubActionsRunnerService',
      cluster,
      taskDefinition,
      enableECSManagedTags: true,
      circuitBreaker: {
        rollback: true,
      },
      capacityProviderStrategies: [
        {
          capacityProvider: 'GitHubActionsRunnerCapacityProvider',
          weight: 1,
        },
      ],
    });

    /*
    const taskDefinition = new FargateTaskDefinition(
      this,
      'GitHubActionsRunnerTaskDefinition',
    );

    taskDefinition.addContainer('GitHubActionsRunnerContainer', {
      image: ContainerImage.fromAsset(path.resolve(__dirname, '../image')),
      logging: LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
      secrets: {
        GITHUB_ACCESS_TOKEN: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubAccessToken',
            {
              parameterName: 'GITHUB_ACCESS_TOKEN',
              version: 0,
            },
          ),
        ),
        GITHUB_ACTIONS_RUNNER_CONTEXT: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubActionsRunnerContext',
            {
              parameterName: 'GITHUB_ACTIONS_RUNNER_CONTEXT',
              version: 0,
            },
          ),
        ),
      },
    });

    new FargateService(this, 'GitHubActionsRunnerService', {
      cluster,
      taskDefinition,
      platformVersion: FargatePlatformVersion.VERSION1_4,
    });
    */
  }
}
