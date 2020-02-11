/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import '@babel/polyfill'
import 'circular-std'
import qs from 'query-string'
import {
	App,
	createSdk
} from '../../lib/chat-widget'

const init = async ({
	product,
	productTitle,
	authToken,
	onClose
}) => {
	const sdk = createSdk()
	window.sdk = sdk

	sdk.setAuthToken(authToken)

	return new Promise((resolve) => {
		ReactDOM.render((
			<App
				sdk={sdk}
				product={product}
				productTitle={productTitle}
				onClose={onClose}
			/>
		), document.getElementById('app'), resolve)
	})
}

const params = qs.parse(window.location.search)

init({
	product: params.product,
	productTitle: params.productTitle,
	authToken: params.authToken,
	onClose: () => {
		const event = {
			type: 'close'
		}

		parent.postMessage(
			JSON.stringify(event),
			'*'
		)
	}
})
