#!/bin/bash

RUNNER_WORKDIR=${RUNNER_WORKDIR:-_work}
RUNNER_TIMEOUT=${RUNNER_TIMEOUT:-60m}
RUNNER_GROUP=${RUNNER_GROUP:default}

deregister_runner() {
  echo "Exit signal caught, deregistering runner..."
  ./config.sh remove --unattended --token "${RUNNER_TOKEN}"
  exit
}

init() {
  AUTH_HEADER="Authorization: token ${GITHUB_TOKEN}"
  ORG=$(cut -d/ -f1 <<< ${RUNNER_CONTEXT})
  REPO=$(cut -d/ -f2 <<< ${RUNNER_CONTEXT})

  if [[ -z "${REPOSITORY}" ]]; then
    TOKEN_REGISTRATION_URL="https://github.schibsted.io/api/v3/orgs/${ORG}/actions/runners/registration-token"
  else
    TOKEN_REGISTRATION_URL="https://github.schibsted.io/api/v3/repos/${ORG}/${REPO}/actions/runners/registration-token"
  fi
    
  RUNNER_TOKEN="$(curl -XPOST -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "${AUTH_HEADER}" \
    "${TOKEN_REGISTRATION_URL}" \
    | jq -r '.token')"
}

configure() {
  ./config.sh --url "https://github.schibsted.io/${RUNNER_CONTEXT}" \
    --token "${RUNNER_TOKEN}" \
    --labels "container:${MEMORY}" \
    --work "${RUNNER_WORKDIR}" \
    --runnergroup "${RUNNER_GROUP}" \
    --unattended \
    --ephemeral
}

run() {
  trap deregister_runner SIGINT SIGQUIT SIGTERM INT QUIT TERM
  timeout --signal=15 "${RUNNER_TIMEOUT}" ./run.sh & wait $! && exit
  deregister_runner
}

echo "Init..."
init

echo "Configuring..."
configure

echo "Running..."
run