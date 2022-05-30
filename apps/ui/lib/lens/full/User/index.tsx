import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { withSetup } from '../../../components';
import { createLazyComponent } from '../../../components/SafeLazy';
import { selectors, actionCreators } from '../../../store';

export const User = createLazyComponent(
	() => import(/* webpackChunkName: "lens-user" */ './User'),
);

const mapStateToProps = (state) => {
	const balenaOrg = _.find(selectors.getOrgs()(state), {
		slug: 'org-balena',
	});
	return {
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
		renderer: compose(
			withSetup,
			connect(mapStateToProps, mapDispatchToProps),
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
