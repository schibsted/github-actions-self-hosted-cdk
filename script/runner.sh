#!/bin/bash

sudo apt-get update -y
sudo apt-get install -y curl jq awscli

AWS_REGION=$AWS_REGION
GH_TOKEN_SSM_PATH=$GH_TOKEN_SSM_PATH
RUNNER_CONTEXT=$RUNNER_CONTEXT
RUNNER_TIMEOUT=$RUNNER_TIMEOUT
RUNNER_WORKDIR=_work

cd /home/ubuntu

install() {
  GITHUB_RUNNER_VERSION=${GITHUB_RUNNER_VERSION:-$(sudo -u ubuntu curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/v//g')} \
  && sudo -u ubuntu curl -sSLO https://github.com/actions/runner/releases/download/v${GITHUB_RUNNER_VERSION}/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz \
  && sudo -u ubuntu tar -zxvf actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz \
  && sudo -u ubuntu rm -f actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz \
  && sudo ./bin/installdependencies.sh
}

deregister_runner() {
  echo "Exit signal caught, deregistering runner..."
  sudo -u ubuntu ./config.sh remove --unattended --token "${RUNNER_TOKEN}"
}

init() {
  GITHUB_TOKEN=$(aws ssm get-parameters --name /github/actions/token --region eu-north-1 --with-decryption | jq -r .Parameters[0].Value)
  AUTH_HEADER="Authorization: token ${GITHUB_TOKEN}"
  ORG=$(cut -d/ -f1 <<< ${RUNNER_CONTEXT})
  REPO=$(cut -d/ -f2 <<< ${RUNNER_CONTEXT})

  if [[ -z "${REPOSITORY}" ]]; then
    TOKEN_REGISTRATION_URL="https://github.schibsted.io/api/v3/orgs/${ORG}/actions/runners/registration-token"
  else
    TOKEN_REGISTRATION_URL="https://github.schibsted.io/api/v3/repos/${ORG}/${REPO}/actions/runners/registration-token"
  fi

  RUNNER_TOKEN="$(sudo -u ubuntu curl -XPOST -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "${AUTH_HEADER}" \
    "${TOKEN_REGISTRATION_URL}" \
    | jq -r '.token')"
}

configure() {
  sudo -u ubuntu ./config.sh --url "https://github.schibsted.io/${RUNNER_CONTEXT}" \
    --token "${RUNNER_TOKEN}" \
    --labels "yes-this-is-dog" \
    --work "${RUNNER_WORKDIR}" \
    --unattended \
    --ephemeral
}

run() {
  trap deregister_runner SIGINT SIGQUIT SIGTERM INT QUIT TERM
  sudo -u ubuntu timeout --signal=15 "${RUNNER_TIMEOUT}" ./run.sh & wait $! && return
  deregister_runner
}

echo "Installing..."
install

echo "Init..."
init

echo "Configuring..."
configure

echo "Running..."
run

echo "Shutting down..."
sudo shutdown -h now