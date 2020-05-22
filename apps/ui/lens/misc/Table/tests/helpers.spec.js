/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../helpers')
const account = require('./fixtures/account')
const pullRequest = require('./fixtures/pull-request')

ava('.flattenSchemaProperties should flatten all fields defined in the type schema', (test) => {
	const result = helpers.flattenSchemaProperties(account)

	const expectedResult = {
		markers: {
			type: 'array',
			items: {
				type: 'string', pattern: '^[a-zA-Z0-9-_/:+]+$'
			}
		},
		name: {
			type: 'string'
		},
		'data.type': {
			default: 'Lead', enum: [ 'Lead', 'Customer' ]
		},
		'data.email': {
			title: 'Email address',
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string', format: 'email'
			}
		},
		'data.discountPercentage': {
			title: 'Discount percentage', type: 'string'
		},
		'data.billingCode': {
			title: 'Billing code', type: 'string'
		},
		'data.startsOnDate': {
			title: 'Starts on date', type: 'string', format: 'date-time'
		},
		'data.endsOnDate': {
			title: 'Ends on date', type: 'string', format: 'date-time'
		},
		'data.industry': {
			title: 'Industry', type: 'string'
		},
		'data.location': {
			title: 'Location', type: 'string'
		},
		'data.stageOfBusiness': {
			title: 'Stage of business', type: 'string'
		},
		'data.description': {
			title: 'Description', type: 'string', format: 'markdown'
		}
	}

	test.deepEqual(result, expectedResult)
})

ava('.flattenSchemaProperties should flatten without losing property keys like titles', (test) => {
	const result = helpers.flattenSchemaProperties(account)

	const expectedResult = {
		title: 'Discount percentage'
	}

	test.deepEqual(result['data.discountPercentage'].title, expectedResult.title)
})

ava('.flattenSchemaProperties should flatten without losing property keys like type', (test) => {
	const result = helpers.flattenSchemaProperties(account)

	const expectedResult = {
		type: 'string'
	}

	test.deepEqual(result['data.discountPercentage'].type, expectedResult.type)
})

ava('.flattenSchemaProperties should return null when card doesn\t have a schema', (test) => {
	const cardWithoutSchema = {
		slug: 'account',
		type: 'type@1.0.0',
		name: 'Account',
		version: '1.0.0',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			meta: {
				relationships: [
					{
						title: 'Opportunities',
						link: 'has attached',
						type: 'opportunity'
					},
					{
						title: 'Contacts',
						link: 'has',
						type: 'contact'
					},
					{
						title: 'Owner',
						link: 'is owned by',
						type: 'user'
					},
					{
						title: 'Backup owners',
						link: 'has backup owner',
						type: 'user'
					}
				]
			}
		},
		requires: [],
		capabilities: []
	}

	const result = helpers.flattenSchemaProperties(cardWithoutSchema)

	const expectedResult = null

	test.deepEqual(result, expectedResult)
})

ava('.getTypeFields should return all fields on a card in a flattend object', (test) => {
	const result = helpers.getTypeFields(pullRequest)

	const expectedResult = {
		name: 'name',
		tags: 'tags',
		'data.mentionsUser': 'data.mentionsUser',
		'data.alertsUser': 'data.alertsUser',
		'data.mentionsGroup': 'data.mentionsGroup',
		'data.alertsGroup': 'data.alertsGroup',
		'data.status': 'data.status',
		'data.archived': 'data.archived',
		'data.created_at': 'data.created_at',
		'data.merged_at': 'data.merged_at',
		'data.repository': 'data.repository',
		'data.head.branch': 'data.head.branch',
		'data.head.sha': 'data.head.sha',
		'data.base.branch': 'data.base.branch',
		'data.base.sha': 'data.base.sha'
	}

	test.deepEqual(result, expectedResult)
})

ava('.getTypeFields should return title of flattend object when title is defined', (test) => {
	const result = helpers.getTypeFields(account)

	const expectedResult = {
		title: 'Discount percentage'
	}

	console.log(result)

	// Console.log(account.data.schema.properties.data)

	test.deepEqual(result['data.discountPercentage'], expectedResult.title)
})
