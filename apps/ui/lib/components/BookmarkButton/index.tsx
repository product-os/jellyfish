import { connect } from 'react-redux';
import { compose } from 'redux';
import { selectors } from '../../store';
import { withSetup } from '../SetupProvider';
import { BookmarkButton as InnerBookmarkButton } from './BookmarkButton';

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser()(state),
	};
};

export const BookmarkButton = compose<any>(
	withSetup,
	connect(mapStateToProps),
)(InnerBookmarkButton);
