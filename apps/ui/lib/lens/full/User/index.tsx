import * as _ from 'lodash';
import { connect } from 'react-redux';
import { selectors, actionCreators } from '../../../core';
import { bindActionCreators } from '../../../bindactioncreators';
import User, { StateProps, DispatchProps, OwnProps } from './User';

const mapStateToProps = (state): StateProps => {
	const balenaOrg = _.find(selectors.getOrgs(state), {
		slug: 'org-balena',
	});
	return {
		balenaOrg,
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
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
		renderer: connect<StateProps, DispatchProps, OwnProps>(
			mapStateToProps,
			mapDispatchToProps,
		)(User),
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
