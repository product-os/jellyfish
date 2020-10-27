/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import ActionCreator from '../'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const sdk = {
		card: {
			get: sandbox.stub()
		}
	}

	const actionCreator = new ActionCreator({
		sdk,
		analytics: {
			track: sandbox.stub()
		}
	})
	actionCreator.analytics.track.resolves()

	const dispatch = (fn) => {
		return fn(dispatch)
	}

	test.context = {
		...test.context,
		actionCreator,
		sdk,
		dispatch
	}
})

ava('updateChannelOnUpsert returns null when the upserted card matches the head card in our channel', async (test) => {
	const {
		actionCreator
	} = test.context

	const headCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstName: 'fake',
				lastName: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-message',
				type: 'message@1.0.0',
				name: 'fake message'
			} ]
		}
	}

	const channel = {
		data: {
			head: headCard
		}
	}

	const updatedChannel = actionCreator.updateChannelOnUpsert(channel, headCard)
	test.is(updatedChannel, null)
})

ava('updateChannelOnUpdate returns a channel with a fresh head' +
' when the upserted card matches our head card and it has been updated', async (test) => {
	const {
		actionCreator
	} = test.context

	const headCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstname: 'fake',
				lastname: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-org',
				type: 'org@1.0.0',
				name: 'fake org'
			} ]
		}
	}

	const channel = {
		data: {
			head: headCard
		}
	}

	const updatedCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstname: 'fake',
				lastname: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-message',
				type: 'message@1.0.0'
			}, {
				id: 'fake-whisper',
				type: 'whisper@1.0.0'
			} ]
		}
	}

	const updatedChannel = actionCreator.updateChannelOnUpsert(channel, updatedCard)
	test.deepEqual(updatedChannel, {
		...channel,
		data: {
			head: updatedCard
		}
	})
})

ava('updateChannelOnUpdate adds a link card to the list of attached elements ' +
'stored on the head of the channel', async (test) => {
	const {
		actionCreator
	} = test.context

	const headCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstname: 'fake',
				lastname: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-org',
				type: 'org@1.0.0',
				name: 'fake org'
			} ]
		}
	}

	const channel = {
		data: {
			head: headCard
		}
	}

	const linkCard = {
		id: 'fake-link',
		type: 'link@1.0.0',
		data: {
			to: {
				id: headCard.id
			}
		}
	}

	const updatedChannel = actionCreator.updateChannelOnUpsert(channel, linkCard)
	test.deepEqual(updatedChannel, {
		...channel,
		data: {
			head: {
				...headCard,
				links: {
					'has attached element': [ ...headCard.links['has attached element'], linkCard ]
				}
			}
		}
	})
})

ava('Existing link cards in the \'has attached element\' list on the head card ' +
'are maintained when the head card is upserted', async (test) => {
	const {
		actionCreator
	} = test.context

	const headCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstname: 'fake',
				lastname: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-message',
				type: 'message@1.0.0'
			}, {
				id: 'fake-link',
				type: 'link@1.0.0'
			} ]
		}
	}

	const channel = {
		data: {
			head: headCard
		}
	}

	const updatedCard = {
		id: 'fake-user',
		type: 'user@1.0.0',
		data: {
			profile: {
				firstname: 'fake',
				lastname: 'user'
			}
		},
		links: {
			'has attached element': [ {
				id: 'fake-message',
				type: 'message@1.0.0'
			}, {
				id: 'fake-whisper',
				type: 'whisper@1.0.0'
			} ]
		}
	}

	const updatedChannel = actionCreator.updateChannelOnUpsert(channel, updatedCard)

	const expectedResult = {
		data: {
			head: {
				id: 'fake-user',
				type: 'user@1.0.0',
				data: {
					profile: {
						firstname: 'fake',
						lastname: 'user'
					}
				},
				links: {
					'has attached element': [ {
						id: 'fake-message',
						type: 'message@1.0.0'
					}, {
						id: 'fake-whisper',
						type: 'whisper@1.0.0'
					},
					{
						id: 'fake-link',
						type: 'link@1.0.0'
					} ]
				}
			}
		}
	}

	test.deepEqual(updatedChannel, expectedResult)
})
