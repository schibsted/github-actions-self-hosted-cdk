## :rocket: _Github Actions_ – self-hosted runners, made easy.

###### _Cost optimized, fully managed, on AWS, powered by CDK._

This is [self-hosted _Github Actions_](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners) runners packaged as a [CDK construct](https://aws.amazon.com/cdk/) for easy reuse.

It has been designed to be:

:moneybag: **As cost effective as possible**<br />
:gem: **Highly elastic**<br />
:sleeping_bed: **Minimal maintenance**<br />
:recycle: **Ephemeral**<br />
:hugs: **Easy to use**<br />

## :tophat: Features

- Runners are spun up on-demand when a new job Github Actions job is queued.
- Runners are tore down and underlying instance is terminated when the job has been completed.
- Runners are fired up on ephemeral EC2 instances with a Docker daemon running to support Docker builds.
- All (x86) instance type are supported.
- Spot instances are used by default.
- Instance type are configurable per job, making it possible to optimize the underlying instance per workload.

## :art: Solution architecture

<a href="https://docs.google.com/drawings/d/1F1ofp86HjaqzCBt2ybKB5ZfXE-AqhX9pdiGPl_f2FE8/edit"><img src="https://docs.google.com/drawings/d/e/2PACX-1vQGyC_Wfy--Lf8Qdk1xkgW2fZrRG-vjAXM3ZcLPcdEI4TtG6BjwQ4gM3qVNTESbhbgTFAdSi8ZTK7Px/pub?w=1570&amp;h=673"></a>

## :traffic_light: Getting started

### First things first

1. Make sure your `~/.aws/credentials` is properly setup.
2. Install the CDK CLI, `npm install -g aws-cdk`
3. Bootstrap your AWS account for CDK by running by following the instructions in the [CDK Bootstrapping guide](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html)

### Define your infrastructure

1. Create a CDK project using the `@spp/github-actions-self-hosted` construct
2. `cdk deploy`
3. Wait for it... Profit!
4. The deploy command will output a webhook hostname. Configure your Github org/repo to send `Workflow jobs` events to that endpoint, e.g. `https://${hostname}/prod/webhook`

## :ribbon: Example project

##### `package.json`

```json
{
  "dependencies": {
    "@spp/github-actions-self-hosted": "^0.1.0",
    "aws-cdk-lib": "^2.3.0"
  }
}
```

#### `index.ts`

```js
#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { GithubActionsRunners } from '@spp/github-actions-self-hosted';

const app = new App();
new GithubActionsRunners(app, 'MyRunners', {
  // AWS account and region
  env: {
    account: '1234567890',
    region: 'eu-north-1',
  },
  // This can be either the name of a GH org or org/repo combination (e.g. my-org/my-repo)
  context: 'my-github-org',
  // A path in AWS Parameter Store where a Github token is securely stored
  tokenSsmPath: '/github/actions/token',
  // A path in AWS Parameter Store where a Github webhook secret is securly stored
  webhookSecretSsmPath: '/github/webhook/secret',
  // Optional: Set private to true to launch runners in a private subnet which communicates with the Internet through a NAT Gateway. Set to false to launch runners in a public subnet. Default: false
  private: true,
  // Optional: Launch runners on spot instances. Default: true
  spot: true,
  // Optional: Specify which Github Actions runner version to use. Default: 2.286.0
  runnerVersion: '252.1.0',
  // Optional: Launch runners into the specified runner group. Default: use the default group
  runnerGroup: 'labs',
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
