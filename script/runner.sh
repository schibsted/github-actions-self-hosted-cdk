#!/bin/bash

AWS_REGION=$AWS_REGION
AWS_INSTANCE_TYPE=$(curl http://169.254.169.254/latest/meta-data/instance-type)
GH_TOKEN_SSM_PATH=$GH_TOKEN_SSM_PATH
RUNNER_CONTEXT=$RUNNER_CONTEXT
RUNNER_TIMEOUT=$RUNNER_TIMEOUT
RUNNER_WORKDIR=_work

cd /home/ubuntu

deregister_runner() {
  echo "Exit signal caught, deregistering runner..."
  sudo -u ubuntu ./config.sh remove --unattended --token "${RUNNER_TOKEN}"
}

init() {
  GITHUB_TOKEN=$(aws ssm get-parameters --name ${GH_TOKEN_SSM_PATH} --region ${AWS_REGION} --with-decryption | jq -r .Parameters[0].Value)
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
    --labels "vm,instance-type:${AWS_INSTANCE_TYPE}" \
    --work "${RUNNER_WORKDIR}" \
    --unattended \
    --ephemeral
}

run() {
  trap deregister_runner SIGINT SIGQUIT SIGTERM INT QUIT TERM
  sudo -u ubuntu timeout --signal=15 "${RUNNER_TIMEOUT}" ./run.sh & wait $! && return
  deregister_runner
}

echo "Init..."
init

echo "Configuring..."
configure

echo "Running..."
run

echo "Shutting down..."
sudo shutdown -h now