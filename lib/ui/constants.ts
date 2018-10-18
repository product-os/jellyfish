// TODO Use 'LINK_CONSTRAINTS' on type cards instead of hardcoding here
export const LINKS: { [k: string]: { [t: string]: string } } = {
	'support-thread': {
		'scratchpad-entry': 'scratchpad entry was used in support thread',
		issue: 'support thread has attached issue',
		symptom: 'support thread has attached symptom',
	},
	'scratchpad-entry': {
		'support-thread': 'support thread used scratchpad entry',
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

