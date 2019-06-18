/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const randomstring = require('randomstring')
const querystring = require('querystring')
const nock = require('nock')
const jws = require('jsonwebtoken')
const jose = require('node-jose')
const sync = require('../../../lib/sync')
const oauth = require('../../../lib/sync/oauth')

ava('.isValidEvent() should return true for Front given anything', async (test) => {
	const result = await sync.isValidEvent('front', {
		api: 'xxxxxxx'
	}, {
		headers: {},
		raw: '....'
	})

	test.true(result)
})

ava('.isValidEvent() should return false for an unknown integration', async (test) => {
	const result = await sync.isValidEvent('helloworld', null, {
		headers: {},
		raw: '....'
	})

	test.false(result)
})

ava('.isValidEvent() should return false given GitHub and no signature header', async (test) => {
	const result = await sync.isValidEvent('github', {
		api: 'xxxxx',
		signature: 'secret'
	}, {
		headers: {},
		raw: '....'
	})

	test.false(result)
})

ava('.isValidEvent() should return false given GitHub and a signature but no key', async (test) => {
	const result = await sync.isValidEvent('github', null, {
		raw: '....',
		headers: {
			'x-hub-signature': 'sha1=aaaabbbbcccc'
		}
	})

	test.false(result)
})

ava('.isValidEvent() should return false given GitHub and a signature mismatch', async (test) => {
	const result = await sync.isValidEvent('github', {
		api: 'xxxxx',
		signature: 'secret'
	}, {
		raw: '{"foo":"bar"}',
		headers: {
			'x-hub-signature': 'sha1=foobarbaz'
		}
	})

	test.false(result)
})

ava('.isValidEvent() should return true given GitHub and a signature match', async (test) => {
	const result = await sync.isValidEvent('github', {
		api: 'xxxxx',
		signature: 'secret'
	}, {
		raw: '{"foo":"bar"}',
		headers: {
			'x-hub-signature': 'sha1=52b582138706ac0c597c315cfc1a1bf177408a4d'
		}
	})

	test.true(result)
})

ava('.isValidEvent() should return true given Discourse and no signature header', async (test) => {
	const result = await sync.isValidEvent('discourse', {
		api: 'xxxxx',
		signature: 'secret'
	}, {
		raw: '....',
		headers: {}
	})

	test.true(result)
})

ava('.isValidEvent() should return false given Discourse and a signature but no key', async (test) => {
	const result = await sync.isValidEvent('discourse', null, {
		raw: '....',
		headers: {
			'x-discourse-event-signature': 'sha256=aaaabbbbcccc'
		}
	})

	test.false(result)
})

ava('.isValidEvent() should return false given Discourse and a signature mismatch', async (test) => {
	const result = await sync.isValidEvent('discourse', {
		api: 'xxxxx',
		signature: 'secret'
	}, {
		raw: '{"foo":"bar"}',
		headers: {
			'x-discourse-event-signature': 'sha256=foobarbaz'
		}
	})

	test.false(result)
})

ava('.isValidEvent() should return true given Discourse and a signature match', async (test) => {
	const result = await sync.isValidEvent('discourse', {
		api: 'xxxxx',
		signature: 'secret'
	}, {
		raw: '{"foo":"bar"}',
		headers: {
			'x-discourse-event-signature': 'sha256=3f3ab3986b656abb17af3eb1443ed6c08ef8fff9fea83915909d1b421aec89be'
		}
	})

	test.true(result)
})

// eslint-disable-next-line max-len
const TEST_BALENA_API_PRIVATE_KEY = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0lGM1M3TkNkV1MyZXJEU0YKbEcxSnBFTEZid0pNckVURUR0d3ZRMFVSUFh5aFJBTkNBQVNDR1pPcmhZTmhoY1c5YTd5OHNTNStINVFFY2tEaApGK0ZVZUV4Si9UcEtCS256RVBMNVBGNGt0L0JwZVlFNmpoQ3UvUmpjWEhXdE1DOXdRTGpQU1ZXaQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg=='
// eslint-disable-next-line max-len
const TEST_BALENA_API_PUBLIC_KEY = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFZ2htVHE0V0RZWVhGdld1OHZMRXVmaCtVQkhKQQo0UmZoVkhoTVNmMDZTZ1NwOHhEeStUeGVKTGZ3YVhtQk9vNFFydjBZM0Z4MXJUQXZjRUM0ejBsVm9nPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='

ava('.isValidEvent() should return false given Balena API and invalid JSON', async (test) => {
	const result = await sync.isValidEvent('balena-api', {
		api: 'xxxxx',
		production: {
			publicKey: TEST_BALENA_API_PUBLIC_KEY
		},
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, {
		raw: '{"foo":"bar"}',
		headers: {
			'content-type': 'application/jose'
		}
	})

	test.false(result)
})

ava('.isValidEvent() should return false given Balena API and invalid payload', async (test) => {
	const result = await sync.isValidEvent('balena-api', {
		api: 'xxxxx',
		production: {
			publicKey: TEST_BALENA_API_PUBLIC_KEY
		},
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, {
		raw: 'xxxxxxxxxxxxxx',
		headers: {
			'content-type': 'application/jose'
		}
	})

	test.false(result)
})

const encryptPayload = async (payload) => {
	const signedToken = jws.sign({
		data: payload
	}, Buffer.from(TEST_BALENA_API_PRIVATE_KEY, 'base64'), {
		algorithm: 'ES256',
		expiresIn: 10 * 60 * 1000,
		audience: 'jellyfish',
		issuer: 'api.balena-cloud.com',
		jwtid: randomstring.generate(20),
		subject: `${payload.id}`
	})

	const keyValue = Buffer.from(TEST_BALENA_API_PUBLIC_KEY, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt({
		format: 'compact'
	}, encryptionKey)
	cipher.update(signedToken)

	const result = await cipher.final()
	return result
}

ava('.isValidEvent() should return true given Balena API and a key match', async (test) => {
	const payload = await encryptPayload({
		id: 666,
		foo: 'bar'
	})

	const result = await sync.isValidEvent('balena-api', {
		api: 'xxxxx',
		production: {
			publicKey: TEST_BALENA_API_PUBLIC_KEY
		},
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, {
		raw: payload,
		headers: {
			'content-type': 'application/jose'
		}
	})

	test.true(result)
})

ava('.isValidEvent() should return false given Balena API and no public key', async (test) => {
	const payload = await encryptPayload({
		id: 666,
		foo: 'bar'
	})

	const result = await sync.isValidEvent('balena-api', {
		api: 'xxxxx',
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, {
		raw: payload,
		headers: {
			'content-type': 'application/jose'
		}
	})

	test.false(result)
})

ava('.isValidEvent() should return true given Balena API and no private key', async (test) => {
	const payload = await encryptPayload({
		id: 666,
		foo: 'bar'
	})

	const result = await sync.isValidEvent('balena-api', {
		api: 'xxxxx',
		production: {
			publicKey: TEST_BALENA_API_PUBLIC_KEY
		}
	}, {
		raw: payload,
		headers: {
			'content-type': 'application/jose'
		}
	})

	test.false(result)
})

ava('.getAssociateUrl() should return null given an invalid integration', (test) => {
	const result = sync.getAssociateUrl('helloworld', {
		appId: 'xxxxx'
	}, 'user-jellyfish', {
		origin: 'https://jel.ly.fish/oauth/helloworld'
	})

	test.falsy(result)
})

ava('.getAssociateUrl() should return null given no token', (test) => {
	const result = sync.getAssociateUrl('outreach', null, 'user-jellyfish', {
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	test.falsy(result)
})

ava('.getAssociateUrl() should return null given no appId', (test) => {
	const result = sync.getAssociateUrl('outreach', {
		api: 'xxxxxx'
	}, 'user-jellyfish', {
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	test.falsy(result)
})

ava('.getAssociateUrl() should be able to generate an Outreach URL', (test) => {
	const result = sync.getAssociateUrl('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg'
	}, 'user-jellyfish', {
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	const qs = [
		'response_type=code',
		'client_id=dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		'redirect_uri=https%3A%2F%2Fjel.ly.fish%2Foauth%2Foutreach',
		'scope=prospects.all',
		'state=user-jellyfish'
	].join('&')

	test.is(result, `https://api.outreach.io/oauth/authorize?${qs}`)
})

ava('.OAUTH_INTEGRATIONS should be an array of strings', (test) => {
	test.true(_.isArray(sync.OAUTH_INTEGRATIONS))
	test.true(_.every(sync.OAUTH_INTEGRATIONS, _.isString))
})

ava('.OAUTH_INTEGRATIONS should contain no duplicates', (test) => {
	test.deepEqual(sync.OAUTH_INTEGRATIONS, _.uniq(sync.OAUTH_INTEGRATIONS))
})

ava('.OAUTH_INTEGRATIONS should contain outreach', (test) => {
	test.true(sync.OAUTH_INTEGRATIONS.includes('outreach'))
})

ava('.associate() should return null given an invalid integration', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com'
			}
		}
	}

	const result = await sync.associate('helloworld', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/helloworld'
	})

	test.falsy(result)
})

ava('.associate() should return null given no token', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com'
			}
		}
	}

	const result = await sync.associate('outreach', null, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	test.falsy(result)
})

ava('.associate() should return null given no appId', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com'
			}
		}
	}

	const result = await sync.associate('outreach', {
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	test.falsy(result)
})

ava('.associate() should return null given no appSecret', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com'
			}
		}
	}

	const result = await sync.associate('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	test.falsy(result)
})

ava('.associate() should return null if the user does not exist', async (test) => {
	const data = {}

	const result = await sync.associate('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	test.falsy(result)
	test.deepEqual(data, {})
})

ava('.associate() should set the access token in the user card', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com'
			}
		}
	}

	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
				client_secret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr',
				redirect_uri: 'https://jel.ly.fish/oauth/outreach',
				code: '12345'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await sync.associate('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	nock.cleanAll()

	test.falsy(result)
	test.deepEqual(data, {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com',
				oauth: {
					outreach: {
						access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
						scope: 'create'
					}
				}
			}
		}
	})
})

ava('.associate() should not replace other integrations', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com',
				oauth: {
					foo: {
						secret: 'bar'
					}
				}
			}
		}
	}

	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
				client_secret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr',
				redirect_uri: 'https://jel.ly.fish/oauth/outreach',
				code: '12345'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await sync.associate('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	nock.cleanAll()

	test.falsy(result)
	test.deepEqual(data, {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com',
				oauth: {
					foo: {
						secret: 'bar'
					},
					outreach: {
						access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
						scope: 'create'
					}
				}
			}
		}
	})
})

ava('.associate() should replace previous integration data', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com',
				oauth: {
					outreach: {
						access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
						scope: 'create'
					}
				}
			}
		}
	}

	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
				client_secret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr',
				redirect_uri: 'https://jel.ly.fish/oauth/outreach',
				code: '12345'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await sync.associate('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: '12345',
		origin: 'https://jel.ly.fish/oauth/outreach'
	})

	nock.cleanAll()

	test.falsy(result)
	test.deepEqual(data, {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com',
				oauth: {
					outreach: {
						access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
						token_type: 'bearer',
						expires_in: 3600,
						refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
						scope: 'create'
					}
				}
			}
		}
	})
})

ava('.associate() should throw given a code mismatch', async (test) => {
	const data = {
		'user-johndoe': {
			type: 'user',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@test.com'
			}
		}
	}

	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
				client_secret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr',
				redirect_uri: 'https://jel.ly.fish/oauth/outreach',
				code: '12345'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	await test.throwsAsync(sync.associate('outreach', {
		appId: 'dJyXQHeh8PLKUr4gdsoUYQ8vFvqJ1D20lnFMxBLg',
		appSecret: 'NlfY38rTt5xxa+Ehi2kV/2rA85C98iDdMF7xD9xr'
	}, 'user-johndoe', {
		log: {
			warn: _.noop
		},
		getElementBySlug: async (type, slug) => {
			return data[slug]
		},
		upsertElement: async (type, object, options) => {
			data[object.slug] = Object.assign({}, object, {
				type
			})
		}
	}, {
		code: 'invalidcode',
		origin: 'https://jel.ly.fish/oauth/outreach'
	}), oauth.OAuthUnsuccessfulResponse)

	nock.cleanAll()
})
