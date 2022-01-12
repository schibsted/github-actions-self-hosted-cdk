import { Stack } from 'aws-cdk-lib';
import {
  Vpc,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { GithubActionsRunnersProps } from './types';
import { setupVMRunners } from './vm';
import { setupWekhook } from './webhook';

export class GithubActionsRunners extends Stack {
  constructor(scope: Construct, id: string, props: GithubActionsRunnersProps) {
    super(scope, id, props);

    const subnetConfiguration = [
      {
        name: `${id}/Subnet/Public`,
        subnetType: SubnetType.PUBLIC,
      },
    ];

    if (props.private) {
      subnetConfiguration.push({
        name: `${id}/Subnet/Private`,
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      });
    }

    const vpc = new Vpc(this, 'Vpc', {
      vpcName: `${id}/Vpc`,
      maxAzs: 1,
      subnetConfiguration,
    });

    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: `${id}/Vpc`,
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    if (props.vm?.enableEc2InstanceConnect) {
      securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    }

    const subnetId = (
      props.private ? vpc.privateSubnets : vpc.publicSubnets
    ).map(x => x.subnetId)[0];

    const vm = setupVMRunners(this, props, securityGroup);
    setupWekhook(this, {
      ...vm,
      subnetId,
      context: props.context,
      spot: (props.spot ?? true).toString(),
      webhookSecretSsmPath: props.webhookSecretSsmPath,
      webhookSecretSsmArn: `arn:aws:ssm:${props.env?.region}:${props.env?.account}:parameter${props.webhookSecretSsmPath}`,
    });
  }
}
