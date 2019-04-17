const fetch = require('node-fetch');
const fs = require('fs');

const spreedlyEnvironmentKey = 'CashierEnvKey';
const spreedlyAccessSecret = 'CashierAccSecret';
const auth = new Buffer(`${spreedlyEnvironmentKey}:${spreedlyAccessSecret}`).toString('base64');

const body = {"receiver":{"receiver_type": "spreedly"}};

// Create the Receiver
const receiverRequest = () => fetch(
  `https://core.spreedly.com/v1/receivers.json`,
  {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'content-type': 'application/json'
    },
    body:JSON.stringify(body),
  }
).then((d) => {
    if (d.status >= 400) {
        console.log(d);
    }

    let result = d.text();
    const receiverResult = JSON.parse(result).toString();
    receiverToken = receiverResult['receiver']['token'];
    console.log(receiverToken);
    if (receiverResult) {
        fs.writeFile(
            `receiverOutput.json`,
            receiverResult,
            () => console.log('Done!'),
        );
    }
});


// Deliver the payment token to target Spreedly Environment
//  We will have to loop through all of the Cashier Spreedly Tokens and deliver all them using the deliverRequest below.
const cashierPaymentTokens = [];
const RoSpreedlyEnvironment = 'RoSpreedlyEnvironmentKey';
const deliverAuth = new Buffer(`${spreedlyEnvironmentKey}:${spreedlyAccessSecret}`).toString('base64');
const url = `https://core.spreedly.com/v1/payment_methods.json?environment_key=${RoSpreedlyEnvironment}`;
let receiverToken = '';

// Use the receiverToken that we just created above
// Use the receiverToken that we just created above
function deliverRequest(cashierPaymentToken) {
    let deliverBody = 
    {
        "delivery": 
        {
            "payment_method_token": cashierPaymentToken,
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

            let mapping = {"cashier_token": cashierPaymentToken, "ro_token": deliverToken};
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

// Loop through all the Cashier tokens and deliver them to RO Spreedly Environment
cashierPaymentTokens.forEach(token => {
    deliverRequest(token);
});
