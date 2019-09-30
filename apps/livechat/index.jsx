/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '@babel/polyfill'
import 'circular-std'
import {
	mount,
	createSdk
} from '@jellyfish/chat-widget'
import * as environment from './environment'

(async () => {
	const sdk = createSdk()
	window.sdk = sdk

	await sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password
	})

	mount(document.getElementById('app'), {
		sdk
	})
})()
