const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')
const sdkHelpers = require('../sdk/helpers')

let sdk = {}

ava.serial.before(async () => {
	sdk = await sdkHelpers.login()
})

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk)
})

ava.serial(
	'should return 404 given a non existent attachment in a card',
	async (test) => {
		const contract = await sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
		const token = sdk.getAuthToken()
		const result = await helpers.http(
			'GET',
			`/api/v2/file/${contract.id}/fil_3e7h9zv`,
			{},
			{
				Authorization: `Bearer ${token}`
			}
		)
		test.is(result.code, 404)
	}
)

ava.serial(
	'should return 404 given an attachment in a non existent card',
	async (test) => {
		const token = sdk.getAuthToken()
		const result = await helpers.http(
			'GET',
			`/api/v2/file/${uuid()}/fil_3e7h9zv`,
			{},
			{
				Authorization: `Bearer ${token}`
			}
		)
		test.is(result.code, 404)
	}
)
