/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// TODO Use 'LINK_CONSTRAINTS' on type cards instead of hardcoding here
export const LINKS: { [k: string]: { [t: string]: string } } = {
	'support-thread': {
		'support-issue': 'support thread is attached to support issue',
	},
	'support-issue': {
		'support-thread': 'support thread has attached support issue',
	},
	'architecture-topic': {
		issue: 'architecture topic has attached issue',
		'pull-request': 'architecture topic has attached spec',
	},
	'pull-request': {
		'architecture-topic': 'spec is attached to architecture topic',
		issue: 'spec has attached issue',
	},
	issue: {
		'architecture-topic': 'issue is attached to architecture topic',
		'pull-request': 'issue is attached to spec',
	},
};

