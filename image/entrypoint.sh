#!/bin/bash

RUNNER_NAME=${RUNNER_NAME:-default}
RUNNER_WORKDIR=${RUNNER_WORKDIR:-_work}

if [[ -z "${GITHUB_TOKEN}" || -z "${RUNNER_CONTEXT}" ]]; then
  echo 'One of the mandatory parameters is missing. Quit!'
  exit 1
else
  AUTH_HEADER="Authorization: token ${GITHUB_TOKEN}"
  #USERNAME=$(cut -d/ -f4 <<< ${RUNNER_CONTEXT})
  #USERNAME=${RUNNER_CONTEXT}
  USERNAME=spt-mediaplatform-labs
  #REPOSITORY=$(cut -d/ -f5 <<< ${RUNNER_CONTEXT})

#  if [[ -z "${REPOSITORY}" ]]; then 
    TOKEN_REGISTRATION_URL="https://github.schibsted.io/api/v3/orgs/${USERNAME}/actions/runners/registration-token"
#  else
#    TOKEN_REGISTRATION_URL="https://github.schibsted.io/api/v3/repos/${USERNAME}/${REPOSITORY}/actions/runners/registration-token"
#  fi
    
  RUNNER_TOKEN="$(curl -XPOST -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "${AUTH_HEADER}" \
    "${TOKEN_REGISTRATION_URL}" \
    | jq -r '.token')"
fi

echo "Configuring..."
./config.sh --url "https://github.schibsted.io/spt-mediaplatform-labs" --token "${RUNNER_TOKEN}" --name "${RUNNER_NAME}" --work "${RUNNER_WORKDIR}"
./run.sh