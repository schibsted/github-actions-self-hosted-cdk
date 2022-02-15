## :rocket: _Github Actions_ – self-hosted runners, made easy.

###### _Cost optimized, fully managed, on AWS, powered by CDK._

This is [self-hosted _Github Actions_](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners) runners packaged as a [CDK construct](https://aws.amazon.com/cdk/), for easy reuse.

It has been designed to be:

:moneybag: **As cost effective as possible**<br />
:gem: **Highly elastic**<br />
:sleeping_bed: **Minimal maintenance**<br />
:stop_sign: **Secure by default**<br />
:recycle: **Ephemeral short-lived instances**<br />
:hugs: **Easy to use**<br />

## :tophat: Features

- Runners are spun up on-demand when a new job Github Actions job is queued.
- Runners are torn down and the underlying instance is terminated when the job has been completed.
- Runners are launched on ephemeral EC2 instances with a Docker daemon running to support Docker builds.
- All instance types are supported.
- Spot instances are used by default.
- The launched instances do not accept any incoming traffic.
- Instance types are configurable per job, making it possible to optimize the underlying instance per workload.
- ~~Both x86 and ARM based instances are supported.~~ (Soon)

## :art: Solution architecture

<img src="https://docs.google.com/drawings/d/e/2PACX-1vQGyC_Wfy--Lf8Qdk1xkgW2fZrRG-vjAXM3ZcLPcdEI4TtG6BjwQ4gM3qVNTESbhbgTFAdSi8ZTK7Px/pub?w=1570&amp;h=673">

## Package distribution

This NPM package is published to Github Packages in our Github Enterprise installation.

See https://github.com/schibsted/github-actions-self-hosted-cdk/packages/1254444

Something like this in `.npmrc` should do the trick:

```
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
@schibsted:registry=https://npm.pkg.github.com
```

## :traffic_light: Getting started

### First things first _(aka getting ready for CDK)_

1. Make sure your `~/.aws/credentials` is properly setup.
2. Install the CDK CLI, `npm install -g aws-cdk`.
3. Bootstrap your AWS account for CDK by running by following the instructions in the [CDK Bootstrapping guide](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

### Ship it!

1. Create a CDK project using the `@schibsted/github-actions-self-hosted-cdk` construct (example below).
2. `cdk deploy`
3. Wait for it... Profit! _(it'll take quite some time on the first deploy)_.
4. The deploy command will output a webhook endpoint, called something like `NameOfStack.WebhookEndpoint`.
5. Configure a hook in your Github org or repo to send `Workflow jobs` events to that endpoint.
   - `https://${GITHUB_HOST}/organizations/my-org/settings/hooks`
   - Content type: `application/json`.
   - Set a secret for the webhook and save that in AWS Parameter Store, for example in path `/github/webhhok/secret`.
6. Create Github Personal Access Token with `workflow` and `admin:org` scopes. Save that token in AWS Parameter Store, for example in `/github/actions/token`.

## :ribbon: Example project

##### `package.json`

```json
{
  "dependencies": {
    "@schibsted/github-actions-self-hosted-cdk": "^0.9.3",
    "aws-cdk-lib": "^2.3.0"
  }
}
```

#### `index.ts`

```js
#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { GithubActionsRunners } from '@schibsted/github-actions-self-hosted-cdk';

const app = new App();
new GithubActionsRunners(app, 'MyRunners', {
  // AWS account and region
  env: {
    account: '1234567890',
    region: 'eu-north-1',
  },
  // Optional: Set privateSubnets to true to launch runners in a private subnet which communicates with the Internet through a NAT Gateway. Set to false to launch runners in a public subnet. Default: false
  privateSubnets: true,
  // Optional: A custom domain name to be used for the Github webhook
  domains: {
    // The domain name to use for the webhook
    domain: 'hello.example.com',
    // The hosted zone for the domain. Must be in the same AWS/Route53 account.
    hostedZoneDomain: 'example.com',
  },
  // A list of all orgs and/or repos to configure
  contexts: [
    {
      // An arbitrary name
      name: 'Labs1',
      // This can be either the name of a GH org or org/repo combination (e.g. my-org/my-repo)
      scope: 'my-org',
      // A path in AWS Parameter Store where a Github webhook secret is securly stored
      webhookSecretSsmPath: '/github/webhook/secret',
      // A path in AWS Parameter Store where a Github token is securely stored
      tokenSsmPath: '/github/actions/token',
      // Optional: Launch runners on spot instances. Default: true
      spot: true,
      // Optional: Terminate a runner after some time period. Default: 30m
      timeout: '10m',
    },
  ],
});
```

## :video_game: How to use self-hosted runners

All jobs that are to run on a self-hosted runner (which is all jobs in a GHE environment), need to have `self-hosted` in the `runs-on` list. In addition, to specify which instance type to use we also need to set `vm:XXX`, where `XXX` is an AWS instance type.

For example:

#### `.github/workflows/my-workflow.yml`

```yaml
jobs:
  build:
    name: Build
    runs-on:
      - self-hosted
      - vm:m5.medium
  deploy:
    name: Deploy
    needs: build
    runs-on:
      - self-hosted
      - vm:t3.micro
```
