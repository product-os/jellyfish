import _ from 'lodash';
import { connect } from 'react-redux';
import { selectors } from '../../../core';
import {
	getViewId,
	RelationshipsTab as InnerRelationshipsTab,
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

export const RelationshipsTab = connect<StateProps, {}, OwnProps>(
	mapStateToProps,
)(InnerRelationshipsTab);
