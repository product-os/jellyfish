import { connect } from 'react-redux';
import _ from 'lodash';
import { bindActionCreators } from '../../bindactioncreators';
import { actionCreators, selectors, State } from '../../store';
import {
	LinkModal as LinkModalInner,
	StateProps,
	DispatchProps,
	OwnProps,
} from './LinkModal';
import {
	UnlinkModal as UnlinkModalInner,
	StateProps as UStateProps,
	DispatchProps as UDispatchProps,
	OwnProps as UOwnProps,
} from './UnlinkModal';

export const LinkModal = connect<StateProps, DispatchProps, OwnProps, State>(
	(state: State): StateProps => {
		return {
			allTypes: selectors.getTypes()(state),
			relationships: selectors.getRelationships()(state),
		};
	},
	(dispatch): DispatchProps => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(LinkModalInner);

export const UnlinkModal = connect<
	UStateProps,
	UDispatchProps,
	UOwnProps,
	State
>(
	(state) => {
		return {
			allTypes: selectors.getTypes()(state),
			relationships: selectors.getRelationships()(state),
		};
	},
	(dispatch) => {
		return {
			actions: bindActionCreators(actionCreators, dispatch),
		};
	},
)(UnlinkModalInner);
