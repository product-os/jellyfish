const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')

let sdk = {}

ava.serial.before(async () => {
	sdk = await sdkHelpers.login()
})

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk)
})

ava.serial(
	'type triggers should exist per version',
	async (test) => {
		const typeSlug = uuid()
		const typeDef = {
			type: 'type@1.0.0',
			slug: typeSlug,
			data: {
				schema: {
					type: 'object',
					properties: {
						data: {
							type: 'object',
							properties: {
								fromLink: {
									type: 'number',
									$$formula: 'PROPERTY(contract.links["was built from"][0], "data.src")'
								}
							}
						}
					}
				}
			}
		}
		const v1 = '0.1.0'
		await sdk.card.create({
			...typeDef,
			version: v1
		})
		const v2 = '1.0.1'
		await sdk.card.create({
			...typeDef,
			version: v2
		})

		const v1Instance1 = await sdk.card.create({
			type: `${typeSlug}@${v1}`
		})
		const v1Instance2 = await sdk.card.create({
			type: `${typeSlug}@${v1}`
		})
		await sdk.card.link(v1Instance1, v1Instance2, 'was built into')
		await sdk.card.update(v1Instance1.id, v1Instance1.type, [ {
			op: 'add', path: '/data/src', value: 42
		} ])

		const v2Instance1 = await sdk.card.create({
			type: `${typeSlug}@${v2}`
		})
		const v2Instance2 = await sdk.card.create({
			type: `${typeSlug}@${v2}`
		})
		await sdk.card.link(v2Instance1, v2Instance2, 'was built into')

		await sdk.card.update(v1Instance1.id, v1Instance1.type, [ {
			op: 'add', path: '/data/src', value: 42
		} ])
		await sdk.card.update(v2Instance1.id, v2Instance1.type, [ {
			op: 'add', path: '/data/src', value: 42
		} ])

		const v2Instance2test = await sdkHelpers.waitForMatch(sdk,
			{
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						const: v2Instance2.id
					},
					data: {
						type: 'object',
						required: [ 'fromLink' ],
						properties: {
							fromLink: {
								const: 42
							}
						}
					}
				}
			},
			4
		)
		test.is(v2Instance2test.id, v2Instance2.id)

		const v1Instance2test = await sdkHelpers.waitForMatch(sdk,
			{
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						const: v1Instance2.id
					},
					data: {
						type: 'object',
						required: [ 'fromLink' ],
						properties: {
							fromLink: {
								const: 42
							}
						}
					}
				}
			},
			4
		)
		test.is(v1Instance2test.id, v1Instance2.id)
	})

ava.serial(
	'transformer properties should evaluate with formulas and triggers',
	async (test) => {
		const src1 = await sdk.card.create({
			type: 'service-source@1.0.0',
			data: {
				logme: true
			}
		})

		const src2 = await sdk.card.create({
			type: 'service-source@1.0.0',
			data: {
				logme: true
			}
		})
		await sdk.card.link(src1, src2, 'was built into')

		console.log(`testing contracts ${src1.id} -[was built into]-> ${src2.id}`)

		const src1final = await sdk.card.create({
			type: 'service-source@1.0.0'
		})
		await sdk.card.link(src1, src1final, 'was merged as')

		const src2test = await sdkHelpers.waitForMatch(sdk,
			{
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						const: src2.id
					},
					data: {
						type: 'object',
						required: [ '$transformer' ],
						properties: {
							$transformer: {
								type: 'object',
								required: [ 'parentMerged' ],
								properties: {
									parentMerged: {
										const: true
									}
								}
							}
						}
					}
				}
			},
			4
		)

		test.is(src2test.id, src2.id)
	}
)
