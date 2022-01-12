import { Stack } from 'aws-cdk-lib';
import { Vpc, Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { GithubActionsRunnersProps } from './types';
import { setupVMRunners } from './vm';
import { setupContainerRunners } from './container';
import { setupWekhook } from './webhook';

export class GithubActionsRunners extends Stack {
  constructor(scope: Construct, id: string, props: GithubActionsRunnersProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'Vpc', {
      isDefault: true,
    });
    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'github-actions-runners',
    });
    if (props.vm?.enableEc2InstanceConnect) {
      securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    }

    const vm = setupVMRunners(this, props, securityGroup);
    const container = setupContainerRunners(this, props, vpc);
    setupWekhook(this, {
      ...vm,
      ...container,
      securityGroup: securityGroup.securityGroupId,
      subnets: vpc.publicSubnets.map(x => x.subnetId).join(','),
      context: props.context,
    });
  }
}
