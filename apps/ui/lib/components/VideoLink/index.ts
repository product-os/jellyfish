import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import { selectors, sdk } from '../../core';
import VideoLink from './VideoLink';

const mapStateToProps = (state) => {
	return {
		sdk,
		types: selectors.getTypes(state),
	};
};

export default compose<any, any, any>(
	connect(mapStateToProps),
	withTheme,
)(VideoLink);
