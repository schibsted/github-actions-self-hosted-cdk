import { Stack, StackProps } from 'aws-cdk-lib';
import {
  Vpc,
  Peer,
  Port,
  SubnetType,
  InstanceInitiatedShutdownBehavior,
  OperatingSystemType,
  InstanceType,
  UserData,
  MachineImage,
  AmazonLinuxGeneration,
  MultipartUserData,
  MultipartBody,
  LaunchTemplate,
  AmazonLinuxImage,
  SecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import {
  Cluster,
  ContainerImage,
  LogDrivers,
  Secret,
  EcsOptimizedImage,
  AsgCapacityProvider,
  Ec2TaskDefinition,
  Ec2Service,
  ContainerDefinition,
} from 'aws-cdk-lib/aws-ecs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Policy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import path from 'path';

export interface GithubActionsRunnerParams extends StackProps {
  instanceType?: string;
  minCapacity?: number;
  maxCapacity?: number;
  runnerMemory?: number;
  runnerTimeout?: string;
  context: string;
  tokenSsmPath: string;
  private?: boolean;
}

export class GithubActionsRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubActionsRunnerParams) {
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
      instanceType: new InstanceType(props.instanceType ?? 't3.micro'),
      minCapacity: props.minCapacity ?? 0,
      maxCapacity: props.maxCapacity ?? 10,
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
      taskDefinition,
      image: ContainerImage.fromAsset(path.resolve(__dirname, '../image')),
      logging: LogDrivers.awsLogs({ streamPrefix: 'GitHubActionsRunner' }),
      memoryReservationMiB: props.runnerMemory ?? 512,
      environment: {
        RUNNER_CONTEXT: props.context,
        RUNNER_TIMEOUT: props.runnerTimeout ?? '60m',
      },
      secrets: {
        GITHUB_TOKEN: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(
            this,
            'GitHubAccessToken',
            {
              parameterName: props.tokenSsmPath,
              version: 0,
            },
          ),
        ),
      },
    });

    taskDefinition.addVolume({
      name: 'docker_sock',
      host: {
        sourcePath: '/var/run/docker.sock',
      },
    });

    container.addMountPoints({
      containerPath: '/var/run/docker.sock',
      sourceVolume: 'docker_sock',
      readOnly: true,
    });

    const service = new Ec2Service(this, 'Service', {
      serviceName: 'GitHubActionsRunnerService',
      cluster,
      taskDefinition,
      enableECSManagedTags: true,
      desiredCount: 0,
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

    const func = new Function(this, 'WebhookLambda', {
      runtime: Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, 'lambda')),
      environment: {
        cluster: cluster.clusterName,
        taskDefinition: taskDefinition.family,
        capacityProvider: capacityProvider.capacityProviderName,
      },
    });
    func.role?.attachInlinePolicy(
      new Policy(this, 'RunTaskPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['ecs:RunTask'],
            resources: ['*'],
            conditions: {
              ArnEquals: {
                'ecs:cluster': cluster.clusterArn,
              },
            },
          }),
          new PolicyStatement({
            actions: ['iam:PassRole'],
            resources: ['*'],
            conditions: {
              StringLike: {
                'iam:PassedToService': 'ecs-tasks.amazonaws.com',
              },
            },
          }),
        ],
      }),
    );
    const api = new RestApi(this, 'api');
    const resource = api.root.addResource('webhook');
    resource.addMethod('POST', new LambdaIntegration(func));

    //const bootHookConf = UserData.forLinux();
    //bootHookConf.addCommands('cloud-init-per once docker_options echo \'OPTIONS="${OPTIONS} --storage-opt dm.basesize=40G"\' >> /etc/sysconfig/docker');
    const setupCommands = UserData.forLinux();
    setupCommands.addCommands('sudo yum install curl');
    setupCommands.addCommands('sudo yum install jq');
    const multipartUserData = new MultipartUserData();
    //multipartUserData.addPart(MultipartBody.fromUserData(bootHookConf, 'text/cloud-boothook; charset="us-ascii"'));
    multipartUserData.addPart(MultipartBody.fromUserData(setupCommands));

    // const userDataScript = readFileSync('./lib/user-data.sh', 'utf8');
    // // 👇 add the User Data script to the Instance
    // ec2Instance.addUserData(userDataScript);
    //multipartUserData.add

    // const ec2Vpc = new Vpc(this, 'Ec2Vpc', {
    //   cidr: '10.0.0.0/16',
    //   natGateways: 0,
    //   /*
    //   subnetConfiguration: [
    //     {name: 'public', cidrMask: 24, subnetType: SubnetType.PUBLIC},
    //   ],*/
    // });

    const defaultVpc = Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true,
    });
    const defaultSecurityGroup = new SecurityGroup(this, 'DefaultSG', {
      vpc: defaultVpc,
      allowAllOutbound: true,
      securityGroupName: 'gh-default-sg',
    });
    defaultSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    // const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
    //   vpc,
    //   allowAllOutbound: true,
    // });
    // securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    new LaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateName: 'GithubActionsRunnerTemplate',
      userData: multipartUserData,
      instanceType: new InstanceType('t3.micro'),
      // machineImage: MachineImage.genericLinux({
      //   'eu-north-1': 'ami-092cce4a19b438926',
      // }),
      machineImage: MachineImage.fromSsmParameter(
        '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
      ),
      // machineImage: MachineImage.latestAmazonLinux({
      //   generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      // }),
      instanceInitiatedShutdownBehavior:
        InstanceInitiatedShutdownBehavior.TERMINATE,
      securityGroup: defaultSecurityGroup,
    });
  }
}
