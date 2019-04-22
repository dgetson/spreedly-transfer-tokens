const fetch = require('node-fetch');
const fs = require('fs');

const spreedlyEnvironmentKey = 'SourceEnvKey';
const spreedlyAccessSecret = 'SourceAccSecret';
const auth = new Buffer(`${spreedlyEnvironmentKey}:${spreedlyAccessSecret}`).toString('base64');

const body = {"receiver":{"receiver_type": "spreedly"}};

// Create the Receiver
const receiverRequest = () => fetch(
  `https://core.spreedly.com/v1/receivers.json`,
  {
    // method: 'POST',
    method: 'GET', // Get all receivers
    headers: {
      Authorization: `Basic ${auth}`,
      'content-type': 'application/json'
    },
    // body:JSON.stringify(body), // Comment out for Get request
  }
).then((d) => {
    if (d.status >= 400) {
        console.log(d);
        return null;
    } else {
        return d.text();
    }
}).then((result) => {
    console.log('text:',result);
    console.log('JSON:',JSON.stringify(JSON.parse(result)));
    
    const receiverResult = JSON.parse(result);
    if (receiverResult) {
        fs.writeFile(
            `output/receiverOutput.json`,
            JSON.stringify(receiverResult),
            () => console.log('Done!'),
        );
        if(receiverResult['receiver'] && receiverResult['receiver']['token']) {
            receiverToken = receiverResult['receiver']['token'];
            console.log(receiverToken);
        } 
    }   
});


// Deliver the payment token to target Spreedly Environment
//  We will have to loop through all of the source Spreedly Tokens and deliver all them using the deliverRequest below.
const sourcePaymentTokens = [];
const targetSpreedlyEnvironment = 'targetSpreedlyEnvironmentKey';
const deliverAuth = new Buffer(`${spreedlyEnvironmentKey}:${spreedlyAccessSecret}`).toString('base64');
const url = `https://core.spreedly.com/v1/payment_methods.json?environment_key=${targetSpreedlyEnvironment}`;
let receiverToken = '';

// Use the receiverToken that we just created above
// Use the receiverToken that we just created above
function deliverRequest(sourcePaymentToken) {
    let deliverBody = 
    {
        "delivery": 
        {
            "payment_method_token": sourcePaymentToken,
            "url": url,
            "headers": "Content-Type: application/json",
            "body": {
                "payment_method":
                {
                    "credit_card":
                    {
                        "first_name": "{{credit_card_first_name}}",
                        "last_name": "{{credit_card_last_name}}",
                        "number":"{{credit_card_number}}",
                        "verification_value": "{{credit_card_verification_value}}",
                        "month":"{{credit_card_month}}",
                        "year":"{{credit_card_year}}"
                    }
                }
            }
        }
    };
    fetch(
        `https://core.spreedly.com/v1/receivers/${receiverToken}/deliver.json`,
        {
            method: 'POST',
            headers: {
            Authorization: `Basic ${deliverAuth}`,
            'content-type': 'application/json'
            },
            body:JSON.stringify(deliverBody),
        }
    ).then((d) => {
        if (d.status >= 400) {
            console.log(d);
        } else {
            return d.text();
        }
    }).then((result) => {
        console.log('Deliver Result:',result);

        let deliverData = result;    
        const deliverResult = JSON.parse(deliverData).toString();
        let deliverToken = 'NA';
        if(deliverResult['transaction'] && deliverResult['transaction']['payment_method'] && deliverResult['transaction']['payment_method']['token']) {
            deliverToken = deliverResult['transaction']['payment_method']['token'];

            let mapping = {"source_token": sourcePaymentToken, "target_token": deliverToken};
            console.log(mapping);

            if (mapping) {
                fs.appendFile(
                    `output/deliverOutput.json`,
                    `${JSON.stringify(mapping)},\n`,
                    () => console.log('Done!'),
                );
            }
        } 
    });
};

// Loop through all the source tokens and deliver them to target Spreedly Environment
sourcePaymentTokens.forEach(token => {
    deliverRequest(token);
});
