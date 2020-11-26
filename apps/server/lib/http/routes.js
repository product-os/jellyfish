/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const errio = require('errio')
const multer = require('multer')
const Storage = require('./file-storage')
const oauth = require('./oauth')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const environment = require('@balena/jellyfish-environment')
const metrics = require('@balena/jellyfish-metrics')
const sync = require('@balena/jellyfish-sync')
const uuid = require('@balena/jellyfish-uuid')
const packageJSON = require('../../../../package.json')
const facades = require('./facades')
const jsonwebtoken = require('jsonwebtoken')

const fileStore = new Storage({
	driver: environment.fileStorage.driver
})
const upload = multer({
	storage: multer.memoryStorage()
})

const sendHTTPError = (request, response, error) => {
	// Add more debugging information in case we pass an invalid object
	// to `errio` (which doesn't handle other data very well).
	if (!_.isError(error)) {
		logger.error(request.context, 'Invalid error object', {
			ip: request.ip,
			error
		})

		return response.status(500).json({
			error: true,
			data: error
		})
	}

	const errorObject = errio.toObject(error, {
		stack: !error.expected
	})

	if (error.expected) {
		logger.info(request.context, 'HTTP expected error', {
			ip: request.ip,
			error: errorObject
		})

		return response.status(400).json({
			error: true,
			data: _.omit(errorObject, [ 'expected' ])
		})
	}

	logger.exception(request.context, 'HTTP unexpected error', error)
	return response.status(500).json({
		error: true,
		data: errorObject.message || error
	})
}

module.exports = (application, jellyfish, worker, producer, options) => {
	const queryFacade = new facades.QueryFacade(jellyfish)
	const authFacade = new facades.AuthFacade(jellyfish)
	const actionFacade = new facades.ActionFacade(worker, producer, fileStore)
	const viewFacade = new facades.ViewFacade(jellyfish, queryFacade)
	const mountGraphqlServer = options.mountGraphqlServer

	application.get('/api/v2/config', (request, response) => {
		response.send({
			codename: packageJSON.codename,
			version: packageJSON.version
		})
	})

	/*
	 * This endpoint should very simple and should not
	 * communicate with the API by design.
	 * The idea is that this endpoint checks the container
	 * health and that only, as otherwise we are
	 * side-checking the database health, and get restarted
	 * even if the database and not the container is the
	 * problem.
	 */
	application.get('/health', (request, response) => {
		return response.status(200).end()
	})

	application.get('/status', (request, response) => {
		return Bluebird.props({
			kernel: jellyfish.getStatus()
		}).then((status) => {
			return response.status(200).json(status)
		}).catch((error) => {
			const errorObject = errio.toObject(error, {
				stack: true
			})

			logger.exception(request.context, 'Status error', error)
			return response.status(500).json({
				error: true,
				data: errorObject
			})
		})
	})

	application.get('/ping', (request, response) => {
		const PING_TYPE = 'ping@1.0.0'
		const PING_SLUG = 'ping-api'

		const getTypeStartDate = new Date()
		return jellyfish.getCardBySlug(
			request.context, jellyfish.sessions.admin, PING_TYPE).then(async (typeCard) => {
			const getTypeEndDate = new Date()
			if (!typeCard) {
				throw new Error(`No type card: ${PING_TYPE}`)
			}

			logger.info(request.context, 'Got type card', {
				slug: typeCard.slug,
				time: getTypeEndDate.getTime() - getTypeStartDate.getTime()
			})

			const enqueueStartDate = new Date()
			const actionRequest = await producer.enqueue(worker.getId(), jellyfish.sessions.admin, {
				action: 'action-ping@1.0.0',
				card: typeCard.id,
				type: typeCard.type,
				context: request.context,
				arguments: {
					slug: PING_SLUG
				}
			})

			const enqueueEndDate = new Date()
			logger.info(request.context, 'Enqueue ping request', {
				slug: actionRequest.slug,
				time: enqueueEndDate.getTime() - enqueueStartDate.getTime()
			})

			const waitStartDate = new Date()
			const results = await producer.waitResults(
				request.context, actionRequest)

			const waitEndDate = new Date()
			logger.info(request.context, 'Waiting for ping results', {
				slug: actionRequest.slug,
				time: waitEndDate.getTime() - waitStartDate.getTime()
			})

			if (results.error) {
				return response.status(500).json(results)
			}

			return response.status(200).json({
				error: false,
				data: _.omit(results.data, [ 'links' ])
			})
		}).catch((error) => {
			const errorObject = errio.toObject(error, {
				stack: true
			})

			logger.exception(request.context, 'Ping error', error)
			return response.status(500).json({
				error: true,
				data: errorObject
			})
		})
	})

	application.get('/v1/registry', async (request, response) => {
		console.log('##################################################')
		console.log('REGISTRY REQUEST')
		console.log('##################################################')
		console.log(request.params)
		console.log('##################################################')

		const b64decode = (str) => { return Buffer.from(str, 'base64').toString().trim() }

		const TOKEN_AUTH_CERT_ISSUER = '192.168.1.145:8000'
		const TOKEN_AUTH_CERT_KID = 'NVJXMzpRREhTOldDUjQ6NzdLUjpVSTJZOldPS086UTUzVTpNUFVXOlFWRVA6QUZZWDpBMkMyOkRLNDcK'
		const TOKEN_AUTH_JWT_ALGO = 'ES256'
		const REGISTRY2_HOST = 'locahost:5000'

		const KEY = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUpRZ0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQ1N3d2dna29BZ0VBQW9JQ0FRRE51aWN6KzNiZ1AwRGgKQWtIdFVzNXl4RTBZbFNVZzhtbFpabG03ajBudEh6SWxMVHVkMnJhakR6Z202bUlBYXJQbEoyc0N2UUE0VElrUApiTGIwYmF4SlQwclJ0UE8vYkNDQ2JVVExacUovTXQrNDd1dW1CTnRDdFdpUWJZUjRtb3dBSTZjQjVRZURTOW9GCkQvalJYTWR0OXlhQmxoemV1TzFDZUdZZys2UFBHTFlNSUx6d1M3ZnhaUEFnb1A1a2FtQXRsdUhmU3FTS3h2c0gKVEQzMHhCNGdKZmE0enlnbzlJQVBLcUdrV3ZsbUlpMWw2bGR5Z2ZGcE5LTFR2citJWTVtcko5T2I0OEkveks3UwpjTjBVUXJWMjN2VG1zZENyWUR5R0dTME5xSWhWQWZoc0h0bG1sNkFucTN6WlBGNmg0T1JMWTdMQXpSa041RzF1CnYwdC8zSFRNWGpQdE00U1llbk42NDVoSmR0TXMwSysvWXIrNjd1RkJlRDJFSEhPRFgwb3ZsUUhpMGtvVm1sQ2MKSDBPNmtJSXhpQ2I2Mzd6SlBEQlJvRmkyNlVjaHdQQjlGUEE0MDRUTWdhZmZmaDVZTlFRUGhBMFBNQ2pPc1VCMwowWm9ZVzJNWXp6cS9YaXRxRk83Rk82KytsSmZWWmUwQXMyS2dHN1hoQ2hDdldxSXpEWnNIdEx3dnVDUXBjOERFCnRORzBKU2ZMZ2N2S2NFYUN4NVRKWXRyVHVMQS85YW9jMldrMDcwcjZmNXNZSEg4bm1UejhiUDUvUUpzSHhpRWsKbWRPS1A1RkRkU3ZGb0dRWmI3L2dmWG1mMkwwWm1VTlBEcndrS1FQd2Rpb0dSTGJ5bEt5QzFTT0JtOS9VM0pHbAp1ZWQ4aWlPZzBFL1QzRldxS08wUXo3YkhnemxoQVFJREFRQUJBb0lDQUJEbDFHaUJwQjhCTXd3SVNtLzYyRGczCkJYb2FiZ1ZKdy90eTI3WDdMQUJOQ3FwaEQ3K0VnbkhjUXlsM0lQdVZ5QmJ2YU91OXFISDNYMTZqK0ZjVlZ3eGkKZGV2SnFDZTE4dW1qbmYzeS9TL2pkdHJTelFwQzVkdVIyUGZiOXdDTStTamR4TTcwQit6eDR3TjliMXVLK2xwKwo3V3ZCYjdlZml1Vmx6RVd6Ulo0eUVtbm1tbjVHU2VLSy91by9Md1lDY3NucjFidW9mdUZqUEtVNXp2RDIxdDZmCkg2ZklaQzBSQUIrK3lhNGRSdFRydzd6V1JiNkRDOWd2V1p4NDAzU1pjYnJNTjZaYlM4NC91ckJRVXVoaUhsT1kKTnBkb1RaSjJBaUtsbUx6QmRnazljekUyUzNjUXh6ZmE3eE5NMFIwTXd0T3FhYmxLWDE5enZzVlU4eGVhZlFGUwpuRWl0K3djNXJjL0xPMjhWRnMrUHMwbDNpZnBmWGQ5cTkraVJ0RThjdUhQaVhuRklSbHA0OUtyY3l3N0hXRjNhCnMxbTR0bnNrYy9TQ0FwNEJ1OE5XUkpzak9iKzRPN1ZpZlNrdW16Zy9QOTFFbHovTVdsV280emJ5UGJUc3BSRzEKY0ZnTmpNcHRnL011WmtDUWYzTFdDZEx0UmQ3M3Fnai9INFo1TFBLOFp2ZWk2UUFaTjV0bEh0VExPUmJTUE54egpJSFh5bDlsRzdNcElSL1NVMFhnSEtnUnd5QWZOaUtNUitCc21lRXhVQ3RCL2NIenhUYmxXWGYvZzZWUGRJTHpYCkhKMDN1MVdPV2Y3NW15a2c0ZFU4YnJoSkdDM0FwTkxSVmp5dWRMYk40cXVyTzZkTFVvYzZvVUQrRWRYYzB5VHIKMEd5a1FCTTFEMUpCaG5RaTM5ZFJBb0lCQVFEbVFaQnZoR1piYXNPd2w5YzE3NXpGWllVZzREb2xDaGJLTDJDRApVTFdYOTEva1hwUTZwNWV3bUhWenpaa09zK1hpbXRZeWZ6VlluNHdzYkIyV056ZUFmakExbHFRajhGYXAwWStPCnB0akgwejRtU3pIb1pBRm9xbXhVV0lDVXBSdFhXVzhjb3pJM3l2WThGY2lyazJrVWJEdnNYc3grYWFiRnFibHQKNU1MYjdiQzhsMUZiRHN0RXhzSm9TWUhUd3F6ZVpUaW9tWVVHZU55NTRMcitzU29xN28xek03cks5dFdRUERhNApvd21SV1cxekVtbTdzWU5yQW1SU1EyNUpodUx2SGxVOG43VTBuMi9PYmpOYnFFdUpVTC9qR0ZHekZBdEY5T25rCkxQWUdYbTF4cmtrL0w0SUR1Z2pyM3lBS1dlUFpteDMrUnBvQ29uR3RGWEtnN21WbEFvSUJBUURrdW9RNXQvSmMKYmJSWC9ZZkZvRDBJV1Q5bTJmRnZVOThxcjlyekJsTnBxQm1hTE9nR2FhQWpyMUJuTEZleitNRW9PWVEzU2d0bgpNdkZsc3QwZnpua2NvNENya013WE8rMVlRMVF0MTdaNXNXTS85a0Q2bi9ITC9nOXFNOHNmRGxoSE9nZ2Q2MVFNCjl1R3IrYkhlTEhOSlBvWHpLRmJNa2NXeWVOeCs5VVpIa1VkNHRVeVhObGZyUHBjbWNiOWJXWHVwSEoxVmRBWWkKbVJXKy9BMlB0enZPdWEwNkpncHpjVno1MzFPWVMwU1ZYVk9jNXJFaTBWUFg1TnpGUHlGUU9sRHVtK2VOS2NVRwpUK0w3Z3BFbk1lZCtJN0w5WkcrTTRUbkk2U2xIbWFzRHMzTHdIZFVvdDU4R3FoSWM0L3U4a05NSVBQQ2RyaEtGCllXOGNJUEdGZ3BGdEFvSUJBR2hNVHBhVkRLQmdMaUF4eDJSQkUydyszaHpVTk1KT1hhQmI4WVhKNjFmWXovRHIKL296TEdXVCt5a1VZWGpwUXR0TDhmQVlIcFN4dHFOcitaakNDOW5zWHJkSzRWOFdIdWxuVitRY1BBS2NUUXRXcAp2Z09jT1I4bUEwZjVodFRPTFNKVitvU29UN2tDRUtPSzRva0ZqdFdYYVZWYVk1cm5WSW00cGF2bnNYUlpxSExrCndBOVZGaklqTGpCN0MzbldkdU9PU2luazBHTHNJRjk2TW5ubjJrZjBJdEtLSGhTTjFwTXRFMFJ6WllRWFZBS0oKMXFjVWM0am5Yblg4NFZvZzVXNlcrTmtySnJPZGZOR3ZEVWg1WlMzZ0MrdGNPclc1WUpuaHBJaWM3UnhaYlkzTworcExLZkVRZjRxYWxQU2d6SzRpSVFQL0xEendlUlF1MzZXS0lXaGtDZ2dFQkFKMEVwY3p4eUVGSFZteXBNVkdyCjVQb2NPbmdpMmFseFRGeURpSzBaQko0ZHRpV3Ura0djdFVDS0U0b2dXTHpGNGVQNVNCaWtqaHQwVDE5ZllJbDcKTm8xQWVRNU9RcTBZaUtEMDU0N283TzJ4cHM2OEFIT001WE1Db0JacUkrRFgraVk3WW1NWHNBV09YZkd2WWptQgpEa3VUem1UVXBuR2RDTGl5Vzd3VUtRRHNiTUlpdzhkeW1QeDNaVkFRK2lwOXpYU1VualdSaHJ5dGxzNGJQandRCnI5QUVpelRGOUpxM2tmby9JNllDMWJ3cjYwQms1ZWxmQmszSllQMVBqMUVDRjVrV0VlbElhV2NoNUZLQW1hRHMKazF4MnFXTm1WV1hESCtZYW1pbjdCZmx1Y1ZNQlI5bkI1RHV3K09vNFlCSmM0V0pnWTFYN3I5ODh1Z2YzWFpZbgp3aWtDZ2dFQWRpOEcwcHIzbkI1cm91TWk0T2JpQTBkRTM5WHRWdEtubkJwYzlYSndjdjdHREVjZU9uNXdmVWpSCktuOE1GT1k0QXNNYnhUU0JjU1B3WGVPTGJ3TUp2YUYvRWEvdFozYmdXaDdQVnVhYzRaYUFoTzZReFVKTjYxeXYKaGdvVmluYndMYXQ3QmVOLzBzVTdaVTF0WkY1OFZtcGdIdXlTTndmVnhrVUlwcUlBd3ZJY3NlWXJUOUZiNlF4NgpvQkVBNm01RnZGRWpyZnVsTXdSNGpmckwvOThJOTdZRTVVQ0R2dG1pV2U4OXJpM2g5UzRaNU02c2VsNGlKOG40CjJsNzA0b0c1aDRVRktqY2ZXbitDbTFSazFJTytQUUpHQ3Y1cEtzTmE4Q3l1RzYrTlhaRUx4VHZHYlNnYjIvYXgKdE9ZUWMwRnhsTG0yaDl0REk3ZnFsVDFneVNQTEdnPT0KLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQo='

		const payload = {
			jti: await uuid.random(),
			nbf: Math.floor(Date.now() / 1000) - 10,
			access: [
				// NOTE this allowes enumerating registry contents
				{
					type: 'registry', name: 'catalog', actions: [ '*' ]
				},

				// TODO parse repository from request?
				{
					type: 'repository', name: '*', actions: [ 'push', 'pull' ]
				}
			]
		}
		const jwtOptions = {
			algorithm: TOKEN_AUTH_JWT_ALGO,
			issuer: TOKEN_AUTH_CERT_ISSUER,
			audience: REGISTRY2_HOST,

			// TODO
			// https://github.com/balena-io/open-balena-api/blob/master/src/features/registry/registry.ts#L379
			subject: '',

			// https://github.com/balena-io/open-balena-api/blob/master/src/features/registry/registry.ts#L27
			expiresIn: 60 * 240,
			header: {
			//	Kid: b64decode(TOKEN_AUTH_CERT_KID)
			}
		}
		return response.status(200).json({
			// Token: jsonwebtoken.sign(payload, b64decode(process.env['TOKEN_AUTH_CERT_KEY']),
			token: jsonwebtoken.sign(payload, b64decode(KEY), jwtOptions)
		})
	})

	application.get('/api/v2/oauth/:provider/:slug', (request, response) => {
		const associateUrl = oauth.getAuthorizeUrl(
			request.params.provider, request.params.slug)
		const status = associateUrl ? 200 : 400
		return response.status(status).json({
			url: associateUrl
		})
	})

	const oauthAssociate = async (request, response, slug, code) => {
		if (!slug) {
			return response.sendStatus(401)
		}

		try {
			// 1. Exchange oauth code for token
			const credentials = await oauth.authorize(
				request.context,
				worker,
				producer,
				options.guestSession,
				request.params.provider, {
					code,
					ip: request.ip
				}
			)

			// 2. Fetch user data from provider
			const externalUser = await oauth.whoami(
				request.context,
				worker,
				jellyfish.sessions.admin,
				request.params.provider,
				credentials
			)

			// 3. Get jellyfish user that matches external user
			let user = await oauth.match(
				request.context,
				worker,
				jellyfish.sessions.admin,
				request.params.provider,
				externalUser, {
					slug
				}
			)

			// 4. If no matching user was found, create it
			if (!user) {
				await oauth.sync(
					request.context,
					worker,
					producer,
					jellyfish.sessions.admin,
					request.params.provider,
					externalUser
				)

				user = await worker.jellyfish.getCardBySlug(
					request.context, jellyfish.sessions.admin, `${slug}@1.0.0`)

				if (!user) {
					return response.status(401).json({
						error: true,
						data: `User sync failed for the user: ${slug}`
					})
				}
			}

			// 5. Attach external token to the user
			await oauth.associate(
				request.context,
				worker,
				producer,
				jellyfish.sessions.admin,
				request.params.provider,
				user,
				credentials, {
					ip: request.ip
				}
			)

			const sessionTypeCard = await jellyfish.getCardBySlug(
				request.context, jellyfish.sessions.admin, 'session@1.0.0')

			/*
			 * This allows us to differentiate two login requests
			 * coming on the same millisecond, unlikely but possible.
			 */
			const suffix = await uuid.random()

			const actionRequest = await producer.enqueue(worker.getId(), jellyfish.sessions.admin, {
				action: 'action-create-card@1.0.0',
				card: sessionTypeCard.id,
				type: sessionTypeCard.type,
				context: request.context,
				arguments: {
					reason: null,
					properties: {
						version: '1.0.0',
						slug: `session-${user.slug}-${Date.now()}-${suffix}`,
						data: {
							actor: user.id
						}
					}
				}
			})

			const createSessionResult = await producer.waitResults(
				request.context, actionRequest)

			if (createSessionResult.error) {
				throw errio.fromObject(createSessionResult.data)
			}

			return response.status(200).json({
				access_token: createSessionResult.data.id,
				token_type: 'Bearer'
			})
		} catch (error) {
			if ([ 'OAuthUnsuccessfulResponse', 'SyncNoMatchingUser' ].includes(error.name)) {
				return response.status(401).json({
					error: true,
					data: _.pick(error, [ 'name', 'message' ])
				})
			}

			return sendHTTPError(request, response, error)
		}
	}

	application.post('/api/v2/oauth/:provider', (request, response) => {
		return oauthAssociate(
			request, response, request.body.slug, request.body.code)
	})

	application.get('/oauth/:provider', (request, response) => {
		return oauthAssociate(
			request, response, request.query.state, request.query.code)
	})

	application.get('/api/v2/type/:type', async (request, response) => {
		return metrics.measureHttpType(() => {
			const [ base, version ] = request.params.type.split('@')
			return jellyfish.query(request.context, request.sessionToken, {
				type: 'object',
				additionalProperties: true,
				required: [ 'type' ],
				properties: {
					type: {
						type: 'string',
						const: `${base}@${version || '1.0.0'}`
					}
				}
			}, {
				limit: 100
			}).then((results) => {
				return response.status(200).json(results)
			})
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.get('/api/v2/id/:id', async (request, response) => {
		return metrics.measureHttpId(() => {
			return jellyfish.getCardById(
				request.context, request.sessionToken, request.params.id).then((card) => {
				if (card) {
					return response.status(200).json(card)
				}

				return response.status(404).end()
			})
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.get('/api/v2/slug/:slug', async (request, response) => {
		return metrics.measureHttpSlug(() => {
			return jellyfish.getCardBySlug(
				request.context, request.sessionToken, `${request.params.slug}@latest`, {
					type: request.params.type
				})
				.then((card) => {
					if (card) {
						return response.status(200).json(card)
					}

					return response.status(404).end()
				})
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	// Some services, such as Workable, require the user to register
	// different endpoints for every type of event we're interested in,
	// which means we can't send more than one event type to
	// /api/v2/hooks/workable. As a solution, we can allow this rule to
	// have an optional "type" parameter that is not used for anything
	// apart from differentiating the endpoints.
	application.all('/api/v2/hooks/:provider/:type*?', (request, response) => {
		const hostname = request.headers.host
		const startDate = new Date()
		logger.info(request.context, 'Received webhook', {
			ip: request.ip,
			source: request.params.provider
		})

		// A dummy /dev/null that we can use in various
		// services for testing purposes.
		if (request.params.provider === 'none') {
			return response.status(200).end()
		}

		const integrationToken =
			environment.integration[request.params.provider]

		return Bluebird.try(async () => {
			if (!await sync.isValidEvent(
				request.params.provider,
				integrationToken, {
					raw: request.rawBody || request.body,
					headers: request.headers
				})) {
				logger.warn(request.context, 'Webhook rejected', {
					ip: request.ip,
					source: request.params.provider,
					hostname,
					body: request.body
				})

				return response.status(401).json({
					error: true,
					data: 'Webhook rejected'
				})
			}

			if (_.isEmpty(request.body)) {
				return response.status(400).json({
					error: true,
					data: 'Invalid external event'
				})
			}

			const validateDate = new Date()
			logger.info(request.context, 'Webhook validated', {
				source: request.params.provider,
				ip: request.ip,
				time: validateDate.getTime() - startDate.getTime()
			})

			const EXTERNAL_EVENT_BASE_TYPE = 'external-event'
			const EXTERNAL_EVENT_TYPE = `${EXTERNAL_EVENT_BASE_TYPE}@1.0.0`
			return jellyfish.getCardBySlug(
				request.context, jellyfish.sessions.admin, EXTERNAL_EVENT_TYPE).then((typeCard) => {
				if (!typeCard) {
					throw new Error(`No type card: ${EXTERNAL_EVENT_TYPE}`)
				}

				return uuid.random().then((id) => {
					const slug = `${EXTERNAL_EVENT_BASE_TYPE}-${id}`

					logger.info(request.context, 'Creating external event', {
						source: request.params.provider,
						slug
					})

					return producer.enqueue(worker.getId(), jellyfish.sessions.admin, {
						action: 'action-create-card@1.0.0',
						card: typeCard.id,
						type: typeCard.type,
						context: request.context,
						arguments: {
							reason: null,
							properties: {
								slug,
								version: '1.0.0',
								data: {
									source: request.params.provider,
									headers: request.headers,
									payload: request.body
								}
							}
						}
					})
				})
			}).then((actionRequest) => {
				const enqueuedDate = new Date()
				logger.info(request.context, 'Webhook enqueued', {
					source: request.params.provider,
					ip: request.ip,
					time: enqueuedDate.getTime() - startDate.getTime()
				})

				return response.status(200).json({
					error: false,
					data: actionRequest
				})
			})
		}).catch((error) => {
			error.body = request.body
			logger.exception(request.context, 'Webhook error', error)
			return response.status(500).json({
				error: true,
				data: {
					type: 'Error',
					message: error.message
				}
			})
		})
	})

	application.get('/api/v2/file/:cardId/:fileName', async (request, response) => {
		const card = await jellyfish.getCardById(
			request.context, request.sessionToken, request.params.cardId)
		if (!card) {
			return response.send(404)
		}

		const sessionCard = await jellyfish.getCardById(
			request.context, request.sessionToken, request.sessionToken)
		if (!sessionCard) {
			return response.send(401)
		}

		const attachment = _.find(_.get(card, [ 'data', 'payload', 'attachments' ]), (item) => {
			return item.url.includes(request.params.fileName)
		})

		if (attachment) {
			return sync.getFile(
				'front',
				environment.integration.front,
				request.params.fileName, {
					log: {
						warn: (message, data) => {
							logger.warn(request.context, message, data)
						},
						info: (message, data) => {
							logger.info(request.context, message, data)
						}
					}
				}, {
					actor: sessionCard.data.actor
				}).then((file) => {
				return response.status(200).send(file)
			}).catch((error) => {
				return sendHTTPError(request, response, error)
			})
		}

		return fileStore.retrieve(
			request.context, request.params.cardId, request.params.fileName).then((file) => {
			if (!file) {
				return response.status(404).end()
			}

			return response.status(200).send(file)
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.post('/api/v2/action', upload.any(), async (request, response) => {
		return metrics.measureHttpAction(() => {
			// If files are uploaded, the action payload is serialized as the form field
			// "action" and will need to be parsed
			const action = request.files
				? JSON.parse(request.body.action)
				: request.body

			logger.info(request.context, 'HTTP action request', {
				ip: request.ip,
				card: action.card,
				type: action.type,
				action: action.action
			})

			if (_.isEmpty(action)) {
				return response.status(400).json({
					error: true,
					data: 'No action request'
				})
			}

			if (!action.type) {
				return response.status(400).json({
					error: true,
					data: 'No action card type'
				})
			}

			if (!action.card) {
				return response.status(400).json({
					error: true,
					data: 'No input card'
				})
			}

			return actionFacade.processAction(
				request.context,
				request.sessionToken,
				action,
				{
					files: request.files
				}
			)
				.then((results) => {
					if (results.error) {
						if (results.data.expected) {
							return response.status(400).json({
								error: true,
								data: _.pick(errio.fromObject(results.data), [ 'name', 'message' ])
							})
						}

						logger.exception(request.context,
							'HTTP response error', errio.fromObject(results.data))
					}

					const code = results.error ? 500 : 200
					return response.status(code).json(results)
				})
		})
			.catch((error) => {
				return sendHTTPError(request, response, error)
			})
	})

	application.post('/api/v2/query', async (request, response) => {
		return metrics.measureHttpQuery(() => {
			if (_.isEmpty(request.body)) {
				return response.status(400).json({
					error: true,
					data: 'No query schema'
				})
			} else if (_.isPlainObject(request.body) && !request.body.query) {
				return response.status(400).json({
					error: true,
					data: 'Invalid request body'
				})
			}

			return queryFacade.queryAPI(
				request.context,
				request.sessionToken,
				request.body.query,
				request.body.options,
				request.ip
			).then((data) => {
				return response.status(200).json({
					error: false,
					data
				})
			})
		})
			.catch((error) => {
				logger.warn(request.context, 'JSON Schema query error', request.body)
				return sendHTTPError(request, response, error)
			})
	})

	application.post('/api/v2/view/:slug', (request, response) => {
		viewFacade.queryByView(
			request.context,
			request.sessionToken,
			request.params.slug,
			request.body.params,
			request.body.options,
			request.ip
		).then((data) => {
			if (!data) {
				return response.status(404).end()
			}

			return response.status(200).json({
				error: false,
				data
			})
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.get('/api/v2/whoami', async (request, response) => {
		return metrics.measureHttpWhoami(async () => {
			const user = await authFacade.whoami(request.context, request.sessionToken, request.ip)

			return response.status(200).json({
				error: false,
				data: user
			})
		}).catch((error) => {
			return sendHTTPError(request, response, error)
		})
	})

	application.post('/api/v2/signup', async (request, response) => {
		const {
			username,
			email,
			password
		} = request.body

		// Verify parameters
		const parameters = {
			username,
			email,
			password
		}
		for (const [ key, value ] of Object.entries(parameters).sort()) {
			if (!_.isString(value)) {
				return response.status(400).json({
					error: true,
					data: `Invalid ${key}`
				})
			}
		}

		// Normalize username and email to lower case
		const name = username.toLowerCase()
		const mail = email.toLowerCase()

		const action = {
			card: 'user',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				email: mail,
				username: `user-${name}`,
				password
			}
		}

		return actionFacade.processAction(
			request.context,
			request.sessionToken,
			action
		)
			.then((results) => {
				if (results.error) {
					if (results.data.expected) {
						return response.status(400).json({
							error: true,
							data: _.pick(errio.fromObject(results.data), [ 'name', 'message' ])
						})
					}

					logger.exception(request.context,
						'HTTP response error', errio.fromObject(results.data))
				}

				const code = results.error ? 500 : 200
				return response.status(code).json(results)
			}).catch((error) => {
				return sendHTTPError(request, response, error)
			})
	})

	mountGraphqlServer(application, {
		jellyfish, queryFacade, logger
	}, '/graphql')
}
