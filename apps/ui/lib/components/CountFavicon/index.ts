import { connect } from 'react-redux';
import { selectors } from '../../core';
import CountFavicon from './CountFavicon';

const getMentionsCount = (mentions) => {
	if (!mentions || !mentions.length) {
		return null;
	}
	if (mentions.length > 99) {
		return '99+';
	}
	return mentions.length.toString();
};

const mapStateToProps = (state) => {
	const isLoggedIn = selectors.getStatus(state) === 'authorized';
	const mentions = isLoggedIn ? selectors.getInboxViewData(state) : [];
	return {
		isLoggedIn,
		label: getMentionsCount(mentions),
	};
};

export default connect(mapStateToProps)(CountFavicon);
