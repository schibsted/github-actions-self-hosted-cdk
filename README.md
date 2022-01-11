## _Github Actions_ – self-hosted runners, made easy.

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
- Runners are tore down and underlying instance/container is terminated when the job has been completed.
- There's support for both container (ECS Fargate) and virtual machine (EC2) based runners.
  - VM runners are typically required if a job need access to a Docker daemon.
- It's possible to use any (x86) instance type for VM runners.
- Container based runners can be configured to have 512, 1024, 2048, 3072, 4096, 5120, 6144, 7168 or 8192 MB of memory.
- Runner type, instance type and memory requirements are configurable per job.

## :art: Solution architecture

<a href="https://docs.google.com/drawings/d/1F1ofp86HjaqzCBt2ybKB5ZfXE-AqhX9pdiGPl_f2FE8/edit"><img src="https://docs.google.com/drawings/d/e/2PACX-1vQGyC_Wfy--Lf8Qdk1xkgW2fZrRG-vjAXM3ZcLPcdEI4TtG6BjwQ4gM3qVNTESbhbgTFAdSi8ZTK7Px/pub?w=1570&amp;h=673"></a>

## :traffic_light: Getting started

### First things first

1. Make sure your `~/.aws/credentials` is properly setup for all relevant AWS accounts
2. Fire up your Docker engine
3. Install the CDK CLI, `npm install -g aws-cdk`
4. Bootstrap your AWS account(s) for CDK by running by following the instructions in the [CDK Bootstrapping guide](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html)

### Define your infrastructure

1. Create a CDK project using the `@spp/github-actions-self-hosted` construct
2. `cdk deploy`
3. Wait for it... Profit!
4. Add webhook to GH
