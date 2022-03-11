import _ from 'lodash';
import { getRelationships } from './RelationshipsTab';

describe('getRelationships', () => {
	it('should return all relevant relationships', () => {
		const relationships = getRelationships('issue');
		const attachedMilestones = _.find(relationships, {
			link: 'has attached',
			type: 'milestone',
		});
		expect(attachedMilestones).not.toBeUndefined();
	});

	it('should default all counts to 0', () => {
		const relationships = getRelationships('issue');
		expect(_.every(relationships, { count: 0 })).toBe(true);
	});

	it('should return an empty array for unknown contract types', () => {
		const relationships = getRelationships('this-is-not-a-type');
		expect(relationships).toEqual([]);
	});
});
