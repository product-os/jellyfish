import { connect } from 'react-redux';
import { sdk, selectors } from '../../core';
import { BookmarkButton as InnerBookmarkButton } from './BookmarkButton';

const mapStateToProps = (state) => {
	return {
		sdk,
		user: selectors.getCurrentUser(state),
	};
};

const connectBookmarkButton = connect<any, any, any>(mapStateToProps);

export const BookmarkButton = connectBookmarkButton(InnerBookmarkButton);
