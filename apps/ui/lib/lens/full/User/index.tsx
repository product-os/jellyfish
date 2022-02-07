import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { sdk, selectors, actionCreators } from '../../../core';
import User from './User';

const mapStateToProps = (state) => {
	const balenaOrg = _.find(selectors.getOrgs(state), {
		slug: 'org-balena',
	});
	return {
		sdk,
		balenaOrg,
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['sendFirstTimeLoginLink', 'createLink']),
			dispatch,
		),
	};
};

const lens = {
	slug: 'lens-full-user',
	type: 'lens',
	version: '1.0.0',
	name: 'User lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(User),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user@1.0.0',
				},
			},
		},
	},
};

export default lens;
