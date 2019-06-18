/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * @namespace JellyfishSDK.integrations
 */
class IntegrationsSdk {
	constructor (sdk) {
		this.sdk = sdk
	}

	async getAuthorizationUrl (user, integration) {
		const endpoint = `oauth/${integration}/${user.slug}`

		const response = await this.sdk.get(endpoint)

		return response.data.url
	}

	async authorize (user, integration, code) {
		await this.sdk.post(`oauth/${integration}`, {
			slug: user.slug,
			code
		})
	}
}

exports.IntegrationsSdk = IntegrationsSdk
