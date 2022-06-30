import type { RelationshipContract } from 'autumndb';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { getRelationships } from './RelationshipsTab';

const relationships: RelationshipContract[] = [
	{
		type: 'relationship@1.0.0',
		slug: `relationship-${uuidv4()}`,
		id: uuidv4(),
		version: '1.0.0',
		active: true,
		name: 'has attached',
		data: {
			from: {
				type: 'issue',
			},
			to: {
				type: 'milestone',
			},
			inverseName: 'is attached to',
			title: 'Milestone',
			inverseTitle: 'Issue',
		},
		tags: [],
		markers: [],
		created_at: new Date().toISOString(),
		requires: [],
		capabilities: [],
	},
];

describe('getRelationships', () => {
	it('should return all relevant relationships', () => {
		const results = getRelationships(relationships, 'issue');
		const attachedMilestones = _.find(results, {
			link: 'has attached',
			type: 'milestone',
		});
		expect(attachedMilestones).not.toBeUndefined();
	});

	it('should default all counts to 0', () => {
		const results = getRelationships(relationships, 'issue');
		expect(_.every(results, { count: 0 })).toBe(true);
	});

	it('should return an empty array for unknown contract types', () => {
		const results = getRelationships(relationships, 'this-is-not-a-type');
		expect(results).toEqual([]);
	});
});
