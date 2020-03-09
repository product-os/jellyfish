/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const logger = require('../../logger').getLogger(__filename)
const assert = require('../../assert')
const uuid = require('../../uuid')

const handler = async (session, context, card, request) => {
	logger.info(request.context, 'Maintaining contact', {
		id: card.id,
		slug: card.slug,
		type: card.type
	})

	const slug = card.slug.replace(/^user-/, 'contact-')
	const userProfile = card.data.profile || {}
	userProfile.name = userProfile.name || {}

	const LINK_NAME_CONTACT_USER = 'is attached to user'
	const LINK_NAME_USER_CONTACT = 'has contact'

	const typeCard = await context.getCardBySlug(
		session, 'contact@1.0.0')
	assert.INTERNAL(request.context, typeCard,
		context.errors.WorkerNoElement, 'No such type: contact')

	const originCard = card.data.origin && (uuid.isUUID(card.data.origin)
		? await context.getCardById(session, card.data.origin)
		: await context.getCardBySlug(session, card.data.origin))

	const contactProperties = [
		{
			path: [ 'active' ],
			value: card.active
		},
		{
			path: [ 'name' ],
			value: card.name
		},
		{
			path: [ 'data', 'origin' ],
			value: card.data.origin
		},
		{
			// Elevate the external event source so that the UI can display it
			// without having to perform extra link traversals on every contact.
			path: [ 'data', 'source' ],
			value: _.get(originCard, [ 'data', 'source' ])
		},
		{
			path: [ 'data', 'profile', 'email' ],
			value: card.data.email
		},
		{
			path: [ 'data', 'profile', 'company' ],
			value: userProfile.company
		},
		{
			path: [ 'data', 'profile', 'title' ],
			value: userProfile.title
		},
		{
			path: [ 'data', 'profile', 'type' ],
			value: userProfile.type
		},
		{
			path: [ 'data', 'profile', 'country' ],
			value: userProfile.country
		},
		{
			path: [ 'data', 'profile', 'city' ],
			value: userProfile.city
		},
		{
			path: [ 'data', 'profile', 'name' ],
			value: {}
		},
		{
			path: [ 'data', 'profile', 'name', 'first' ],
			value: userProfile.name.first &&
			_.capitalize(userProfile.name.first.trim())
		},
		{
			path: [ 'data', 'profile', 'name', 'last' ],
			value: userProfile.name.last &&
			_.capitalize(userProfile.name.last.trim())
		}
	]

	const attachedContacts = await context.query(context.privilegedSession, {
		type: 'object',
		$$links: {
			[LINK_NAME_CONTACT_USER]: {
				type: 'object',
				required: [ 'slug', 'type' ],
				properties: {
					slug: {
						type: 'string',
						const: card.slug
					},
					type: {
						type: 'string',
						const: card.type
					}
				}
			}
		},
		required: [ 'type', 'links' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'contact@1.0.0'
			},
			links: {
				type: 'object'
			}
		}
	}, {
		limit: 1
	})

	if (attachedContacts.length > 0) {
		const contact = attachedContacts[0]
		const patch = contactProperties.reduce((accumulator, property) => {
			const current = _.get(contact, property.path)
			const value = _.isNil(property.value) || _.isEqual(property.value, {})
				? current
				: property.value

			if (!_.isNil(value) && !_.isEqual(value, current)) {
				accumulator.push({
					op: current ? 'replace' : 'add',
					path: `/${property.path.join('/')}`,
					value
				})
			}

			return accumulator
		}, [])

		logger.info(request.context, 'Patching shadow profile', {
			slug: contact.slug,
			data: contact.data,
			patch
		})

		await context.patchCard(session, typeCard, {
			timestamp: request.timestamp,
			reason: 'Updated user contact',
			actor: request.actor,
			originator: request.originator,
			attachEvents: true
		}, contact, patch)

		return {
			id: contact.id,
			slug: contact.slug,
			version: contact.version,
			type: contact.type
		}
	}

	const contact = {
		slug,
		version: '1.0.0',
		name: card.name || '',
		active: card.active,
		data: {
			profile: {}
		}
	}

	for (const property of contactProperties) {
		if (!property.value) {
			continue
		}

		_.set(contact, property.path, property.value)
	}

	const linkTypeCard = await context.getCardBySlug(
		session, 'link@1.0.0')
	assert.INTERNAL(request.context, linkTypeCard,
		context.errors.WorkerNoElement, 'No such type: link')

	const contactCard = await context.getCardBySlug(
		session, `${contact.slug}@${contact.version}`)

	const result = contactCard || await context.insertCard(session, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		reason: 'Created user contact',
		attachEvents: true
	}, contact)

	await context.insertCard(session, linkTypeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: false
	}, {
		slug: await context.getEventSlug('link'),
		type: 'link@1.0.0',
		name: LINK_NAME_CONTACT_USER,
		data: {
			inverseName: LINK_NAME_USER_CONTACT,
			from: {
				id: result.id,
				type: result.type
			},
			to: {
				id: card.id,
				type: card.type
			}
		}
	})

	// Retry now that we fixed the missing link
	if (contactCard) {
		return handler(session, context, card, request)
	}

	return {
		id: result.id,
		type: result.type,
		version: result.version,
		slug: result.slug
	}
}

module.exports = {
	handler
}
