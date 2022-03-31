import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors } from '../../../core';
import {
	getViewId,
	RelationshipsTab as InnerRelationshipsTab,
	StateProps,
	DispatchProps,
	OwnProps,
	SLUG,
} from './RelationshipsTab';

export { getRelationships } from './RelationshipsTab';

const mapStateToProps = (state, props): StateProps => {
	const viewData = selectors.getViewData(state, getViewId(props.card.id));
	const target = props.card.type;
	return {
		viewData,
		types: selectors.getTypes(state),
		lensState: selectors.getLensState(state, SLUG, target),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export const RelationshipsTab = connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(InnerRelationshipsTab);
