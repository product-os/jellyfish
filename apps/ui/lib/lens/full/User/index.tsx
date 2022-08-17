import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { withSetup } from '../../../components';
import { createLazyComponent } from '../../../components/SafeLazy';
import { selectors, actionCreators, State } from '../../../store';
import type { StateProps, DispatchProps, OwnProps } from './User';

export const User = createLazyComponent(
	() => import(/* webpackChunkName: "lens-user" */ './User'),
);

const Renderer = withSetup(
	connect<StateProps, DispatchProps, OwnProps, State>(
		(state): StateProps => {
			const balenaOrg = _.find(selectors.getOrgs()(state), {
				slug: 'org-balena',
			});
			return {
				balenaOrg,
			};
		},

		(dispatch): DispatchProps => {
			return {
				actions: bindActionCreators(actionCreators, dispatch),
			};
		},
	)(User),
);

const lens = {
	slug: 'lens-full-user',
	type: 'lens',
	version: '1.0.0',
	name: 'User lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: Renderer,
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
