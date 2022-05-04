import { Stack, CfnOutput } from 'aws-cdk-lib';
import {
  Vpc,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { GithubActionsRunnersProps } from './types';
import { buildImage, setupRunners } from './vm';
import { setupApiGateway, setupWekhook } from './webhook';

export class GithubActionsRunners extends Stack {
  constructor(scope: Construct, id: string, props: GithubActionsRunnersProps) {
    super(scope, id, props);

    const subnetConfiguration = [
      {
        name: `${id}/Subnet/Public`,
        subnetType: SubnetType.PUBLIC,
      },
    ];

    if (props.privateSubnets) {
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

    if (props.debugMode) {
      securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    }

    const subnetId = (
      props.privateSubnets ? vpc.privateSubnets : vpc.publicSubnets
    ).map(x => x.subnetId)[0];

    const { imageId } = buildImage(this, props);
    const gateway = setupApiGateway(this, props.domain);
    props.contexts?.forEach(context => {
      const vm = setupRunners(this, props, context, securityGroup, imageId);
      const webhook = setupWekhook(this, context, gateway, {
        ...vm,
        subnetId,
        scope: context.scope,
        spot: (context.spot ?? true).toString(),
        webhookSecretSsmPath: context.webhookSecretSsmPath,
        webhookSecretSsmArn: `arn:aws:ssm:${props.env?.region}:${props.env?.account}:parameter${context.webhookSecretSsmPath}`,
        volumeSize: String(props.volumeSize ?? 128),
      });
      const endpoint = webhook.domain
        ? `https://${webhook.domain.domainName}/${context.scope}`
        : `${webhook.url}${context.scope}`;
      new CfnOutput(this, `WebhookEndpoint.${context.name}`, {
        value: endpoint,
      });
    });
  }
}
