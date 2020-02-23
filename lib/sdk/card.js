/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	commaListsOr
} = require('common-tags')

const uuidv4 = require('uuid/v4')
const Bluebird = require('bluebird')
const clone = require('deep-copy')
const jsonpatch = require('fast-json-patch')
const _ = require('lodash')
const uuid = require('../uuid')
const {
	MULTIPLICITY
} = require('./link-constraints')

const getLinkQuery = (verb, fromCard, toCard = null) => {
	const query = {
		type: 'object',
		properties: {
			name: {
				type: 'string',
				const: verb
			},
			type: {
				type: 'string',
				enum: [ 'link', 'link@1.0.0' ]
			},
			active: {
				type: 'boolean',
				const: true
			},
			data: {
				type: 'object',
				properties: {
					from: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								const: fromCard.id
							}
						}
					}
				}
			}
		},
		additionalProperties: true
	}

	if (toCard) {
		query.properties.data.properties.to = {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: toCard.id
				}
			}
		}
	}

	return query
}

/**
 * @namespace JellyfishSDK.card
 */
class CardSdk {
	constructor (sdk) {
		this.sdk = sdk
	}

	/**
     * @summary Get a card
     * @name get
     * @public
     * @function
     * @memberof JellyfishSDK.card
     *
     * @description Get a card using an id or a slug
     *
     * @param {String} idOrSlug - The id or slug of the card to retrieve
     * @param {Object} options - Extra query options to use
     * @param {Object} [options.schema] - Additional schema that will be merged
     * into the query
     *
     * @fulfil {Object|null} - A single card, or null if one wasn't found
     * @returns {Promise}
     *
     * @example
     * sdk.card.get('user-johndoe')
     * 	.then((card) => {
     * 		console.log(card)
     * 	})
     *
     * sdk.card.get('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
     * 	.then((card) => {
     * 		console.log(card)
     * 	})
     */
	async get (idOrSlug, options = {}) {
		if (uuid.isUUID(idOrSlug)) {
			return this.sdk.getById(idOrSlug)
		}

		return this.sdk.getBySlug(idOrSlug)
	}

	/**
	 * @summary Get a card and its attached timeline
	 * @name get
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Get a card and its timeline using an id or a slug
	 *
	 * @param {String} idOrSlug - The id or slug of the card to retrieve
	 * @param {Object} options - Additional options
	 *
	 * @fulfil {Object|null} - A single card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.getWithTimeline('user-johndoe')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 *
	 * sdk.card.getWithTimeline('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 */
	getWithTimeline (idOrSlug, options = {}) {
		const schema = uuid.isUUID(idOrSlug) ? {
			type: 'object',
			description: `Get by id ${idOrSlug}`,
			properties: {
				id: {
					type: 'string',
					const: idOrSlug
				}
			},
			required: [ 'id' ],
			additionalProperties: true
		} : {
			type: 'object',
			description: `Get by slug ${idOrSlug}`,
			properties: {
				slug: {
					type: 'string',
					const: idOrSlug
				}
			},
			required: [ 'slug' ],
			additionalProperties: true
		}

		_.merge(schema, options.schema)

		if (options.type) {
			schema.properties.type = {
				type: 'string'
			}

			const [ typeBase, typeVersion ] = options.type.split('@')

			// TODO: Remove this conditional once the whole
			// system relies on versioned references.
			if (typeVersion) {
				schema.properties.type.enum = [ typeBase, options.type ]
			} else {
				schema.properties.type.const = options.type
			}
		}

		_.merge(schema, {
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true
				}
			},
			properties: {
				links: {
					type: 'object',
					additionalProperties: true
				}
			}
		})

		return this.sdk.query(schema, {
			limit: 1
		}).then((elements) => {
			return _.first(elements) || null
		})
	}

	/**
	 * @summary Get a card and cards linked to it using a verb
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Get a card and its timeline using an id or a slug
	 *
	 * @param {String} idOrSlug - The id or slug of the card to retrieve
	 * @param {String[]} verbs - Verbs to load
	 * @param {Object} options - Additional options
	 *
	 * @fulfil {Object|null} - A single card, or null if one wasn't found
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.getWithLinks('user-johndoe', [ 'has attached element' ])
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 *
	 * sdk.card.getWithTimeline('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', [ 'has attached element' ])
	 * 	.then((card) => {
	 * 		console.log(card)
	 * 	})
	 */
	getWithLinks (idOrSlug, verbs, options = {}) {
		const schema = uuid.isUUID(idOrSlug) ? {
			type: 'object',
			description: `Get with links by id ${idOrSlug}`,
			properties: {
				id: {
					type: 'string',
					const: idOrSlug
				}
			},
			required: [ 'id' ],
			additionalProperties: true
		} : {
			type: 'object',
			description: `Get with links by slug ${idOrSlug}`,
			properties: {
				slug: {
					type: 'string',
					const: idOrSlug
				}
			},
			required: [ 'slug' ],
			additionalProperties: true
		}

		if (options.type) {
			schema.properties.type = {
				type: 'string',
				const: options.type
			}
		}

		_.merge(schema, {
			$$links: {},
			properties: {
				links: {
					type: 'object',
					additionalProperties: true
				}
			}
		})

		for (const verb of _.castArray(verbs)) {
			schema.$$links[verb] = {
				type: 'object',
				additionalProperties: true
			}
		}

		return this.sdk.query(schema, {
			limit: 1
		}).then((elements) => {
			return _.first(elements) || null
		})
	}

	/**
	 * @summary Get all cards of a given type
	 * @name getAllByType
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Get all cards that have the provided 'type' attribute
	 *
	 * @param {String} cardType - The type of card to retrieve
	 *
	 * @fulfil {Object[]} - All cards of the given type
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.getAllByType('view')
	 * 	.then((cards) => {
	 * 		console.log(cards)
	 * 	})
	 */
	getAllByType (cardType) {
		return this.sdk.getByType(cardType)
	}

	getByCreator (actorId, type) {
		const schema = {
			$$links: {
				'has attached element': {
					type: 'object',
					properties: {
						type: {
							const: 'create'
						},
						data: {
							type: 'object',
							properties: {
								actor: {
									const: actorId
								}
							},
							required: [ 'actor' ]
						}
					},
					required: [ 'data' ]
				}
			},
			type: 'object',
			properties: {
				type: {
					const: type
				}
			},
			additionalProperties: true
		}

		return this.sdk.query(schema)
	}

	/**
     * @summary Create a new card
     * @name create
     * @public
     * @function
     * @memberof JellyfishSDK.card
     *
     * @description Send an action request to create a new card
     *
     * @param {Object} card - The card that should be created, must include
     * a 'type' attribute.
     *
     * @fulfil {Card} - The newly created card
     * @returns {Promise}
     *
     * @example
     * sdk.card.create({
     * 	type: 'thread',
     * 	data: {
     * 		description: 'lorem ipsum dolor sit amet'
     * 	}
     * })
     * 	.then((id) => {
     * 		console.log(id)
     * 	})
     */
	create (card) {
		// For backwards compatibility purposes
		card.linked_at = card.linked_at || {}

		return this.sdk.action({
			card: card.type,
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				reason: null,
				properties: _.omit(card, [ 'type' ])
			}
		})
	}

	/**
	 * @summary Update a card
	 * @name update
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Send an action request to update a card
	 *
	 * @param {String} id - The id of the card that should be updated
	 * @param {String} type - The card type
	 * @param {Object[]} patch - A JSON Patch set of operationss
	 *
	 * @fulfil {Object} - An action response object
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.update('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', 'support-thread', [
	 *   {
	 *     op: 'add',
	 *     path: '/data/description',
	 *     value: 'foo bar baz'
	 *   }
	 * ]).then((response) => {
	 *   console.log(response)
	 * })
	 */
	async update (id, type, patch) {
		return this.sdk.action({
			card: id,
			type,
			action: 'action-update-card@1.0.0',
			arguments: {
				reason: null,
				patch
			}
		})
	}

	/**
     * @summary Remove a card
     * @name remove
     * @public
     * @function
     * @memberof JellyfishSDK.card
     *
     * @description Send an action request to remove a card
     *
     * @param {String} id - The id of the card that should be removed
     * @param {String} type - The type of the card that should be removed
     *
     * @returns {Promise}
     *
     * @example
     * sdk.card.remove('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', 'card')
     */
	remove (id, type) {
		return this.sdk.action({
			card: id,
			type,
			action: 'action-delete-card@1.0.0'
		})
	}

	/**
	 * @summary Create a link card
	 * @name remove
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Link two cards together
	 *
	 * @param {String} fromCard - The id of the card that should be linked from
	 * @param {String} toCard - The id of the card that should be linked to
	 * @param {String} verb - The name of the relationship
	 *
	 * @returns {Promise}
	 */
	async link (fromCard, toCard, verb) {
		if (!verb) {
			throw new Error('No verb provided when creating link')
		}

		const linkOptions = _.filter(this.sdk.LINKS, {
			data: {
				from: fromCard.type.split('@')[0],
				to: toCard.type.split('@')[0]
			}
		})
		const option = _.find(linkOptions, {
			name: verb
		})
		if (!option) {
			const opts = _.map(linkOptions, (opt) => {
				return `"${opt.name}"`
			})
			throw new Error(`No link definition found between "${fromCard.type}" and "${toCard.type}" using verb "${verb}":
				Use one of ${commaListsOr `${opts}`} instead`)
		}

		const inverseOption = _.find(this.sdk.LINKS, {
			slug: option.data.inverse
		})

		if (!fromCard.id) {
			throw new Error(`No id in "from" card: ${JSON.stringify(fromCard)}`)
		}
		if (!toCard.id) {
			throw new Error(`No id in "to" card: ${JSON.stringify(toCard)}`)
		}

		// If there is a link constraint...
		if (option.data.toMultiplicity === MULTIPLICITY.ZERO_OR_ONE) {
			// ...check for existing links from
			const links = await this.sdk.query(
				getLinkQuery(verb, fromCard),
				{
				// There should only be max one existing link in this case
					limit: 1
				})

			// ...if there is an existing link...
			if (links && links.length) {
				// ...remove it before creating the new link
				const existingLink = links[0]
				await this.remove(existingLink.id, existingLink.type)
			}
		}

		// Check for existing link with this verb between these two cards
		const links = await this.sdk.query(
			getLinkQuery(verb, fromCard, toCard),
			{
				// There should only be max one existing link in this case
				limit: 1
			})

		// If found, just return that object
		if (links && links.length) {
			return links[0]
		}

		// If not found, create the new link
		const payload = {
			card: 'link',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				reason: null,
				properties: {
					slug: `link-${fromCard.id}-${verb.replace(/\s/g, '-')}-${toCard.id}-${uuidv4()}`,
					tags: [],
					version: '1.0.0',
					links: {},
					requires: [],
					capabilities: [],
					active: true,
					name: verb,
					data: {
						inverseName: inverseOption.name,
						from: {
							id: fromCard.id,
							type: fromCard.type
						},
						to: {
							id: toCard.id,
							type: toCard.type
						}
					}
				}
			}
		}

		return this.sdk.action(payload)
			.catch((error) => {
				console.error('Failed to create a link', error)
				throw error
			})
	}

	unlink (fromCard, toCard, verb) {
		if (!verb) {
			throw new Error('No verb provided when removing link')
		}

		// First query for link cards
		return this.sdk.query(
			getLinkQuery(verb, fromCard, toCard)).then((linkCards) => {
			// Then remove the link cards
			const removeActions = linkCards.map((linkCard) => {
				return this.remove(linkCard.id, linkCard.type)
			})
			return Bluebird.all(removeActions)
		}).catch((error) => {
			console.error('Failed to unlink cards', error)
			throw error
		})
	}

	/**
	 * @summary Mark a card as read
	 * @name markAsRead
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Link two cards together
	 *
	 * @param {String} userSlug - The slug of the user who has read the card
	 * @param {String} card - The card that should be marked as read
	 *
	 * @returns {Promise}
	 */
	async markAsRead (userSlug, card) {
		const typeBase = card.type.split('@')[0]
		if (typeBase !== 'message' && typeBase !== 'whisper') {
			throw new Error(`Only cards of type "message" or "whisper" can be marked as read: received card of type ${typeBase}`)
		}

		const message = _.get(card, [ 'data', 'payload', 'message' ], '')

		// Only continue if the message mentions the current user
		if (message.toLowerCase().includes(`@${userSlug.slice(5)}`) || message.toLowerCase().includes(`!${userSlug.slice(5)}`)) {
			const readBy = _.get(card, [ 'data', 'readBy' ], [])

			if (!_.includes(readBy, userSlug)) {
				const patch = jsonpatch.compare(card, _.set(
					clone(card),
					[ 'data', 'readBy' ],
					[ ...readBy, userSlug ]
				))

				return this.sdk.card.update(card.id, card.type, patch)
					.catch((error) => {
						console.error(error)
					})
			}
		}

		return null
	}

	/**
	 * @summary Mark a card as unread
	 * @name markAsUnread
	 * @public
	 * @function
	 * @memberof JellyfishSDK.card
	 *
	 * @description Link two cards together
	 *
	 * @param {String} userSlug - The slug of the user who has read the card
	 * @param {String} card - The card that should be marked as unread
	 *
	 * @returns {Promise}
	 */
	async markAsUnread (userSlug, card) {
		const typeBase = card.type.split('@')[0]
		if (typeBase !== 'message' && typeBase !== 'whisper') {
			throw new Error(
				`Only cards of type "message" or "whisper" can be marked as unread: received card of type ${typeBase}`
			)
		}

		const message = _.get(card, [ 'data', 'payload', 'message' ], '')

		// Only continue if the message mentions the current user
		if (message.includes(`@${userSlug.slice(5)}`) || message.includes(`!${userSlug.slice(5)}`)) {
			const readBy = _.get(card, [ 'data', 'readBy' ], [])

			if (_.includes(readBy, userSlug)) {
				const patch = jsonpatch.compare(card, _.set(
					clone(card),
					[ 'data', 'readBy' ],
					_.without(readBy, userSlug)
				))

				return this.sdk.card.update(card.id, card.type, patch)
					.catch((error) => {
						console.error(error)
					})
			}
		}

		return null
	}
}

exports.CardSdk = CardSdk
