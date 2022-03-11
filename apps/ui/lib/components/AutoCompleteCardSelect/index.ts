import { connect } from 'react-redux';
import { compose } from 'redux';
import { withSetup } from '../SetupProvider';
import { selectors } from '../../core';
import { AutoCompleteCardSelect as AutoCompleteCardSelectInner } from './AutoCompleteCardSelect';

const mapStateToProps = (state: any) => {
	return {
		types: selectors.getTypes(state),
	};
};

export const AutoCompleteCardSelect = compose<any>(
	withSetup,
	connect(mapStateToProps),
)(AutoCompleteCardSelectInner);
