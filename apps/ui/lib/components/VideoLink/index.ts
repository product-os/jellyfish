import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import { selectors } from '../../store';
import VideoLink from './VideoLink';
import { withSetup } from '../SetupProvider';

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes()(state),
	};
};

export default compose<any, any, any, any>(
	connect(mapStateToProps),
	withTheme,
	withSetup,
)(VideoLink);
