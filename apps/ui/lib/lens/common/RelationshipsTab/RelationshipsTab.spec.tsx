import { getWrapper } from '../../../../test/ui-setup';
import sinon from 'sinon';
import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { RelationshipsTab, getRelationships } from './RelationshipsTab';

const wrappingComponent = getWrapper().wrapper;

const sandbox = sinon.createSandbox();

const type1 = {
	slug: 'user',
	name: 'User',
};

const type2 = {
	slug: 'org',
	name: 'Organization',
};

const card = {
	slug: 'user-1',
	type: 'user@1.0.0',
};

const types = [type1, type2];

let context: any = {};

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

// NOTE: Unit testing RelationshipsTab is limited because:
//       1. The Grommet Select component doesn't seem to play nicely
//          with enzyme - throwing an unhandled error 'onActivate is not a function'
//          when the tab component is clicked.
//       2. Enzyme can't access the state hook values of a functional
//          component so you can't even test that the state is correct.
describe('RelationshipsTab', () => {
	beforeEach(() => {
		context = {
			defaultProps: {
				viewData: undefined,
				types,
				card,
				actions: {
					loadViewData: sandbox.stub(),
				},
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('loads view data when mounted', async () => {
		const { defaultProps } = context;
		await mount(<RelationshipsTab {...defaultProps} />, {
			wrappingComponent,
		});
		expect(defaultProps.actions.loadViewData.callCount).toBe(1);
	});
});
