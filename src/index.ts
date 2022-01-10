import { Stack } from 'aws-cdk-lib';
import { Vpc, Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { GithubActionsRunnerParams } from './types';
import { setupVMRunners } from './vm';
import { setupContainerRunners } from './container';
import { setupWekhook } from './webhook';

export class GithubActionsRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubActionsRunnerParams) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'Vpc', {
      isDefault: true,
    });
    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'gh-actions-runner-sg',
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    const vm = setupVMRunners(this, props, securityGroup);
    const container = setupContainerRunners(this, props, vpc);
    setupWekhook(this, {
      ...vm,
      ...container,
      securityGroup: securityGroup.securityGroupId,
      subnets: vpc.publicSubnets.map(x => x.subnetId).join(','),
    });
  }
}
