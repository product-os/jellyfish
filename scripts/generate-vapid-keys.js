#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// A simple utility script to generate a public/private key
// pair of VAPID keys using the web-push package.
// The output of this script should be used to populate the
// following environment variables:
// * VAPID_PUBLIC_KEY
// * VAPID_PRIVATE_KEY

const webpush = require('web-push')

const vapidKeys = webpush.generateVAPIDKeys()

console.log(`
VAPID KEYS:
	Public:  ${vapidKeys.publicKey}
	Private: ${vapidKeys.privateKey}
`)
