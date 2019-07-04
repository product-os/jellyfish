/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

/**
 * @summary Check if a string is a UUID
 * @name isUUID
 * @function
 * @public
 *
 * @param {String} text - string
 * @returns {Boolean} whether the string is a uuid
 *
 * @example
 * if (isUUID('4a962ad9-20b5-4dd8-a707-bf819593cc84')) {
 *   console.log('This is a uuid')
 * }
 */
const isUUID = (text) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text)
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
		if (isUUID(idOrSlug)) {
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
		const schema = isUUID(idOrSlug) ? {
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
				type: 'string',
				const: options.type
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
	 * sdk.card.getWithLinksTimeline('user-johndoe', [ 'has attached element' ])
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
		const schema = isUUID(idOrSlug) ? {
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

		_.merge(schema, options.schema)

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
			action: 'action-create-card',
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
	 * @param {Object} card - An object that will be used to update the card
	 *
	 * @fulfil {Object} - An action response object
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.update('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', {
	 * 	data: {
	 * 		description: 'foo bar baz'
	 * 	}
	 * })
	 * 	.then((response) => {
	 * 		console.log(response)
	 * 	})
	 */
	update (id, card) {
		// For backwards compatibility purposes
		card.linked_at = card.linked_at || {}

		return this.sdk.action({
			card: id,
			type: card.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				properties: _.omit(card, [ 'type', 'id', 'links' ])
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
			action: 'action-delete-card'
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
	 * @param {String} name - The name of the relationship
	 *
	 * @returns {Promise}
	 *
	 * @example
	 * sdk.card.link(
	 *   '8b465c9a-b4cb-44c1-9df9-632649d7c4c3',
	 *   '3fb768e9-3069-4bb4-bf17-516ebbd00757',
	 *   'is attached to'
	 * )
	 */
	link (fromCard, toCard, name) {
		let inverseName = null
		if (name === 'is attached to') {
			inverseName = 'has attached element'
		} else if (name === 'has attached element') {
			inverseName = 'is attached to'
		} else {
			inverseName = _.get(this.sdk.LINKS, [ toCard.type, fromCard.type ], null)
		}

		const canonicalName = _.get(this.sdk.LINKS, [ fromCard.type, toCard.type ], null)

		if (canonicalName && canonicalName !== name) {
			throw new Error(`Incorrect link name used between ${fromCard.type} and ${toCard.type}: "${name}".
				Use "${canonicalName}" instead`)
		}

		if (!inverseName) {
			throw new Error(`No link definition found between ${fromCard.type} and ${toCard.type}`)
		}

		if (!fromCard.id) {
			throw new Error(`No id in "from" card: ${JSON.stringify(fromCard)}`)
		}
		if (!toCard.id) {
			throw new Error(`No id in "to" card: ${JSON.stringify(toCard)}`)
		}
		return this.sdk.action({
			card: 'link',
			type: 'type',
			action: 'action-upsert-card',
			arguments: {
				reason: null,
				properties: {
					slug: `link-${fromCard.id}-${name.replace(/\s/g, '-')}-${toCard.id}`,
					tags: [],
					version: '1.0.0',
					links: {},
					requires: [],
					capabilities: [],
					active: true,
					name,
					data: {
						inverseName,
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
		})
	}
}
exports.CardSdk = CardSdk
