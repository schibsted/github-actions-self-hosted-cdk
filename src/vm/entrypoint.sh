#!/bin/bash

AWS_REGION=$AWS_REGION
AWS_INSTANCE_TYPE=$(curl http://169.254.169.254/latest/meta-data/instance-type)
GITHUB_TOKEN_SSM_PATH=$GITHUB_TOKEN_SSM_PATH
RUNNER_SCOPE=$RUNNER_SCOPE
RUNNER_TIMEOUT=$RUNNER_TIMEOUT
RUNNER_GROUP=$RUNNER_GROUP
GITHUB_HOST=$GITHUB_HOST

RUNNER_WORKDIR=_work

cd /home/ubuntu

deregister_runner() {
  echo "Exit signal caught, deregistering runner..."
  sudo -u ubuntu ./config.sh remove --unattended --token "${RUNNER_TOKEN}"
}

init() {
  GITHUB_TOKEN=$(aws ssm get-parameters --name ${GITHUB_TOKEN_SSM_PATH} --region ${AWS_REGION} --with-decryption | jq -r .Parameters[0].Value)
  AUTH_HEADER="Authorization: token ${GITHUB_TOKEN}"
  PARTS=(${RUNNER_SCOPE//// })
  ORG=${PARTS[0]}
  REPO=${PARTS[1]}

  if [[ ${GITHUB_HOST} = "github.com" ]]; then
    BASE_URI="https://api.${GITHUB_HOST}"
  else
    BASE_URI="https://${GITHUB_HOST}/api/v3"
  fi

  if [[ -z "${REPO}" ]]; then
    TOKEN_REGISTRATION_URL="${BASE_URI}/orgs/${ORG}/actions/runners/registration-token"
  else
    TOKEN_REGISTRATION_URL="${BASE_URI}/repos/${ORG}/${REPO}/actions/runners/registration-token"
  fi

  RUNNER_TOKEN="$(sudo -u ubuntu curl -XPOST -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "${AUTH_HEADER}" \
    "${TOKEN_REGISTRATION_URL}" \
    | jq -r '.token')"
}

configure() {
  sudo -u ubuntu ./config.sh --url "https://${GITHUB_HOST}/${RUNNER_SCOPE}" \
    --token "${RUNNER_TOKEN}" \
    --labels "vm:${AWS_INSTANCE_TYPE}" \
    --work "${RUNNER_WORKDIR}" \
    --runnergroup "${RUNNER_GROUP}" \
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