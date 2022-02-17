import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { selectors, actionCreators } from '../../../core';
import {
	getViewId,
	RelationshipsTab as InnerRelationshipsTab,
	DispatchProps,
	StateProps,
	OwnProps,
} from './RelationshipsTab';

export { getRelationships } from './RelationshipsTab';

const mapStateToProps = (state, props): StateProps => {
	const viewData = selectors.getViewData(state, getViewId(props.card.id));
	return {
		viewData,
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'loadViewData',
				'getLinks',
				'queryAPI',
				'addChannel',
			]),
			dispatch,
		),
	};
};

export const RelationshipsTab = connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(InnerRelationshipsTab);
