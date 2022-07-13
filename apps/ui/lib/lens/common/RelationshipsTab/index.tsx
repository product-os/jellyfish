import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from '../../../bindactioncreators';
import { actionCreators, selectors } from '../../../store';
import {
	RelationshipsTab as InnerRelationshipsTab,
	StateProps,
	DispatchProps,
	OwnProps,
	SLUG,
} from './RelationshipsTab';

export { getRelationships } from './RelationshipsTab';

const mapStateToProps = (state, props): StateProps => {
	const target = props.card.type;
	return {
		types: selectors.getTypes()(state),
		lensState: selectors.getLensState(SLUG, target)(state),
		relationships: selectors.getRelationships()(state),
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
