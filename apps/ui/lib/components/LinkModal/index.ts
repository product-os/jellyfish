import { connect } from 'react-redux';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../core';
import { LinkModal as LinkModalInner } from './LinkModal';
import { UnlinkModal as UnlinkModalInner } from './UnlinkModal';

export const LinkModal = connect<any, any, any>(
	(state) => {
		return {
			allTypes: selectors.getTypes(state),
		};
	},
	(dispatch) => {
		return {
			actions: bindActionCreators(
				_.pick(actionCreators, ['createLink']),
				dispatch,
			),
		};
	},
)(LinkModalInner);

export const UnlinkModal = connect<any, any, any>(
	(state) => {
		return {
			allTypes: selectors.getTypes(state),
		};
	},
	(dispatch) => {
		return {
			actions: bindActionCreators(
				_.pick(actionCreators, ['removeLink']),
				dispatch,
			),
		};
	},
)(UnlinkModalInner);
