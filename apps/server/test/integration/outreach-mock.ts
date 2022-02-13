import _ from 'lodash';

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
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
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
	workPhones: [],
};

interface Entity {
	type: 'prospect';
	id: number;
	attributes: typeof DEFAULT_ATTRIBUTES & {
		createdAt: string;
		updatedAt: string;
		emails: string[];
	};
	relationships: ReturnType<typeof getRelationships>;
	links: {
		self: string;
	};
}

let DATA: Entity[] = [];
const CREATOR_ID = 9999;

const getRelationships = (id: number) => {
	return {
		account: {
			data: {
				type: 'account',
				id: 95,
			},
		},
		activeSequenceStates: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/sequenceStates?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
			meta: {
				count: 0,
			},
		},
		batches: {
			links: {
				related: `https://api.outreach.io/api/v2/batches?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
		},
		calls: {
			links: {
				related: `https://api.outreach.io/api/v2/calls?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
		},
		creator: {
			data: {
				type: 'user',
				id: CREATOR_ID,
			},
		},
		defaultPluginMapping: {
			data: null,
		},
		emailAddresses: {
			data: [
				{
					type: 'emailAddress',
					id,
				},
			],
			links: {
				related: `https://api.outreach.io/api/v2/emailAddresses?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
			meta: {
				count: 1,
			},
		},
		favorites: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/favorites?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
			meta: {
				count: 0,
			},
		},
		mailings: {
			links: {
				related: `https://api.outreach.io/api/v2/mailings?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
		},
		opportunities: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/opportunities?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
			meta: {
				count: 0,
			},
		},
		owner: {
			data: null,
		},
		persona: {
			data: null,
		},
		phoneNumbers: {
			data: [],
			links: {
				related: `https://api.outreach.io/api/v2/phoneNumbers?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
			meta: {
				count: 0,
			},
		},
		sequenceStates: {
			links: {
				related: `https://api.outreach.io/api/v2/sequenceStates?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
		},
		stage: {
			data: null,
		},
		tasks: {
			links: {
				related: `https://api.outreach.io/api/v2/tasks?filter%5Bprospect%5D%5Bid%5D=${id}`,
			},
		},
		updater: {
			data: {
				type: 'user',
				id: CREATOR_ID,
			},
		},
	};
};

export const reset = () => {
	DATA = [];
};

export const getProspectByEmail = (email: string) => {
	if (!_.isString(email)) {
		return {
			code: 400,
			response: {},
		};
	}

	const results = _.filter(DATA, (entry) => {
		return entry.type === 'prospect' && entry.attributes.emails.includes(email);
	});

	return {
		code: 200,
		response: {
			data: results,
			meta: {
				count: results.length,
			},
		},
	};
};

export const postProspect = (body: {
	data: {
		type: 'prospect';
		attributes: {
			name?: string;
			nickname?: string;
			firstName?: string;
			lastName?: string;
			emails?: string[];
		};
	};
}) => {
	const date = new Date().toISOString();
	const index = DATA.length;
	const id = index + 1;

	body.data.attributes.name =
		body.data.attributes.name || body.data.attributes.nickname;

	// We don't really know what the exact limit is, and the
	// Outreach API is not very helpful.
	if (
		body.data.attributes.firstName &&
		body.data.attributes.firstName.length > 50
	) {
		return {
			code: 422,
			response: {
				errors: [
					{
						id: 'validationDataTooLongError',
						title: 'Validation Data Too Long Error',
						detail: 'Data provided is too long.',
					},
				],
			},
		};
	}

	if (
		_.some(body.data.attributes.emails, (email) => {
			return /@balena\.io$/.test(email);
		})
	) {
		return {
			code: 422,
			response: {
				errors: [
					{
						id: 'validationError',
						source: {
							pointer: '/data',
						},
						title: 'Validation Error',
						detail: 'Contacts contact is using an excluded email address.',
					},
				],
			},
		};
	}

	if (
		_.some(body.data.attributes.emails, (email) => {
			return getProspectByEmail(email).response.meta!.count > 0;
		})
	) {
		return {
			code: 422,
			response: {
				errors: [
					{
						id: 'validationError',
						source: {
							pointer: '/data',
						},
						title: 'Validation Error',
						detail: 'Contacts email hash has already been taken.',
					},
				],
			},
		};
	}

	DATA[index] = {
		type: 'prospect',
		id,
		attributes: Object.assign({}, DEFAULT_ATTRIBUTES, body.data.attributes, {
			createdAt: date,
			updatedAt: date,
		}),
		relationships: getRelationships(id),
		links: {
			self: `https://api.outreach.io/api/v2/prospects/${id}`,
		},
	};

	return {
		code: 201,
		response: {
			data: DATA[index],
		},
	};
};

export const patchProspect = (body: {
	data: {
		id: number;
		attributes: Partial<typeof DEFAULT_ATTRIBUTES>;
	};
}) => {
	const index = _.findIndex(DATA, {
		type: 'prospect',
		id: body.data.id,
	});

	if (index <= -1) {
		return {
			code: 404,
			response: {
				errors: [
					{
						id: 'resourceNotFound',
						title: 'Resource Not Found',
						detail: `Could not find 'prospect' with ID '${body.data.id}'.`,
					},
				],
			},
		};
	}

	if (
		body.data.attributes.emails &&
		_.some(body.data.attributes.emails, (email) => {
			return /@balena\.io$/.test(email);
		})
	) {
		return {
			code: 422,
			response: {
				errors: [
					{
						id: 'validationError',
						source: {
							pointer: '/data',
						},
						title: 'Validation Error',
						detail: 'Contacts contact is using an excluded email address.',
					},
				],
			},
		};
	}

	if (
		body.data.attributes.emails &&
		_.some(body.data.attributes.emails, (email) => {
			const prospect = getProspectByEmail(email);
			return (
				prospect.response.meta!.count > 0 &&
				prospect.response.data![0].id !== body.data.id
			);
		})
	) {
		return {
			code: 422,
			response: {
				errors: [
					{
						id: 'validationError',
						source: {
							pointer: '/data',
						},
						title: 'Validation Error',
						detail: 'Contacts email hash has already been taken.',
					},
				],
			},
		};
	}

	const currentAttributes = _.cloneDeep(DATA[index].attributes);
	const newAttributes = _.cloneDeep(
		Object.assign({}, DATA[index].attributes, body.data.attributes),
	);

	// When nothing really changes
	if (_.isEqual(currentAttributes, newAttributes)) {
		return {
			code: 422,
			response: {
				errors: [
					{
						id: 'validationDuplicateValueError',
						title: 'Validation Duplicate Value Error',
						detail: 'A Contact with this email_hash already exists.',
					},
				],
			},
		};
	}

	DATA[index].attributes = newAttributes;

	return {
		code: 200,
		response: {
			data: DATA[DATA.length],
		},
	};
};

export const getProspect = (id: number) => {
	const prospect = _.find(DATA, {
		type: 'prospect',
		id,
	});

	if (!prospect) {
		return {
			code: 404,
			response: {},
		};
	}

	return {
		code: 200,
		response: {
			data: prospect,
		},
	};
};
