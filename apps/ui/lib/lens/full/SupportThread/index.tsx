import pick from 'lodash/pick';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { withDefaultGetActorHref } from '@balena/jellyfish-ui-components';
import { actionCreators, selectors, sdk } from '../../../core';
import { createLazyComponent } from '../../../components/SafeLazy';

export const SupportThreadBase = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-support-thread" */ './SupportThreadBase'),
);

const mapStateToProps = (state) => {
	return {
		accounts: selectors.getAccounts(state),
		types: selectors.getTypes(state),
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			pick(actionCreators, [
				'addChannel',
				'getActor',
				'loadMoreViewData',
				'removeChannel',
			]),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: compose(
			connect(mapStateToProps, mapDispatchToProps),
			withDefaultGetActorHref(),
		)(SupportThreadBase),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread@1.0.0',
				},
			},
		},
	},
};
