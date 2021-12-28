const AWS = require('aws-sdk');

const handler = async (event) => {
  console.log('event', event);
  console.log('aws client', AWS);
  return {
    body: JSON.stringify({
      status: 'ok'
    }),
    statusCode: 200,
  };
}

module.exports = { handler };