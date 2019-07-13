/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const DATA = []
const CREATOR_ID = 9999

const DEFAULT_ATTRIBUTES = {
	addedAt: null,
	addressCity: null,
	addressCountry: null,
	addressState: null,
	addressStreet: null,
	addressStreet2: null,
	addressZip: null,
	angelListUrl: null,
	availableAt: null,
	callOptedOut: false,
	callsOptStatus: null,
	callsOptedAt: null,
	campaignName: null,
	clickCount: 0,
	contactHistogram: [
		[ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ],
		[ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ], [ 0, 0 ]
	],
	custom1: null,
	custom10: null,
	custom11: null,
	custom12: null,
	custom13: null,
	custom14: null,
	custom15: null,
	custom16: null,
	custom17: null,
	custom18: null,
	custom19: null,
	custom2: null,
	custom20: null,
	custom21: null,
	custom22: null,
	custom23: null,
	custom24: null,
	custom25: null,
	custom26: null,
	custom27: null,
	custom28: null,
	custom29: null,
	custom3: null,
	custom30: null,
	custom31: null,
	custom32: null,
	custom33: null,
	custom34: null,
	custom35: null,
	custom36: null,
	custom37: null,
	custom38: null,
	custom39: null,
	custom4: null,
	custom40: null,
	custom41: null,
	custom42: null,
	custom43: null,
	custom44: null,
	custom45: null,
	custom46: null,
	custom47: null,
	custom48: null,
	custom49: null,
	custom5: null,
	custom50: null,
	custom51: null,
	custom52: null,
	custom53: null,
	custom54: null,
	custom55: null,
	custom6: null,
	custom7: null,
	custom8: null,
	custom9: null,
	dateOfBirth: null,
	degree: null,
	emailOptedOut: false,
	emails: [],
	emailsOptStatus: null,
	emailsOptedAt: null,
	engagedAt: null,
	engagedScore: 0,
	eventName: null,
	externalId: null,
	externalOwner: null,
	externalSource: 'outreach-api',
	facebookUrl: null,
	firstName: null,
	gender: null,
	githubUrl: null,
	githubUsername: null,
	googlePlusUrl: null,
	graduationDate: null,
	homePhones: [],
	jobStartDate: null,
	lastName: null,
	linkedInConnections: null,
	linkedInId: null,
	linkedInSlug: null,
	linkedInUrl: null,
	middleName: null,
	mobilePhones: [],
	name: null,
	nickname: null,
	occupation: null,
	openCount: 0,
	optedOut: false,
	optedOutAt: null,
	otherPhones: [],
	personalNote1: null,
	personalNote2: null,
	preferredContact: null,
	quoraUrl: null,
	region: null,
	replyCount: 0,
	school: null,
	score: null,
	smsOptStatus: null,
	smsOptedAt: null,
	smsOptedOut: false,
	source: null,
	specialties: null,
	stackOverflowId: null,
	stackOverflowUrl: null,
	tags: [],
	timeZone: null,
	timeZoneIana: null,
	timeZoneInferred: null,
	title: null,
	touchedAt: null,
	twitterUrl: null,
	twitterUsername: null,
	voipPhones: [],
	websiteUrl1: null,
	websiteUrl2: null,
	websiteUrl3: null,
	workPhones: []
}

const getRelationships = (id) => {
	return {
		account: {
			data: {
				type: 'account',
				id: 95
			}
		},
		activeSequenceStates: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/sequenceStates?filter%5Bprospect%5D%5Bid%5D=${id}`
			},
			meta: {
				count: 0
			}
		},
		batches: {
			links: {
				related: `https://api.outreach.io/api/v2/batches?filter%5Bprospect%5D%5Bid%5D=${id}`
			}
		},
		calls: {
			links: {
				related: `https://api.outreach.io/api/v2/calls?filter%5Bprospect%5D%5Bid%5D=${id}`
			}
		},
		creator: {
			data: {
				type: 'user',
				id: CREATOR_ID
			}
		},
		defaultPluginMapping: {
			data: null
		},
		emailAddresses: {
			data: [
				{
					type: 'emailAddress',
					id
				}
			],
			links: {
				related: `https://api.outreach.io/api/v2/emailAddresses?filter%5Bprospect%5D%5Bid%5D=${id}`
			},
			meta: {
				count: 1
			}
		},
		favorites: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/favorites?filter%5Bprospect%5D%5Bid%5D=${id}`
			},
			meta: {
				count: 0
			}
		},
		mailings: {
			links: {
				related: `https://api.outreach.io/api/v2/mailings?filter%5Bprospect%5D%5Bid%5D=${id}`
			}
		},
		opportunities: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/opportunities?filter%5Bprospect%5D%5Bid%5D=${id}`
			},
			meta: {
				count: 0
			}
		},
		owner: {
			data: null
		},
		persona: {
			data: null
		},
		phoneNumbers: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/phoneNumbers?filter%5Bprospect%5D%5Bid%5D=${id}`
			},
			meta: {
				count: 0
			}
		},
		sequenceStates: {
			links: {
				related: `https://api.outreach.io/api/v2/sequenceStates?filter%5Bprospect%5D%5Bid%5D=${id}`
			}
		},
		stage: {
			data: null
		},
		tasks: {
			links: {
				related: `https://api.outreach.io/api/v2/tasks?filter%5Bprospect%5D%5Bid%5D=${id}`
			}
		},
		updater: {
			data: {
				type: 'user',
				id: CREATOR_ID
			}
		}
	}
}

exports.postProspect = (body) => {
	const date = new Date().toISOString()
	const index = DATA.length
	const id = index + 1

	body.data.attributes.name = body.data.attributes.name ||
		body.data.attributes.nickname

	DATA[index] = {
		type: 'prospect',
		id,
		attributes: Object.assign({}, DEFAULT_ATTRIBUTES, body.data.attributes, {
			createdAt: date,
			updatedAt: date
		}),
		relationships: getRelationships(id),
		links: {
			self: `https://api.outreach.io/api/v2/prospects/${id}`
		}
	}

	return {
		code: 201,
		response: {
			data: DATA[index]
		}
	}
}

exports.patchProspect = (body) => {
	const index = _.findIndex(DATA, {
		type: 'prospect',
		id: body.data.id
	})

	DATA[index].attributes = Object.assign({},
		DATA[index].attributes, body.data.attributes)

	return {
		code: 200,
		response: {
			data: DATA[DATA.length]
		}
	}
}

exports.getProspect = (id) => {
	const prospect = _.find(DATA, {
		type: 'prospect',
		id
	})

	if (!prospect) {
		return {
			code: 404,
			response: {}
		}
	}

	return {
		code: 200,
		response: {
			data: prospect
		}
	}
}
