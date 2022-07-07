import { connect } from 'react-redux';
import _ from 'lodash';
import { selectors } from '../../store';
import PageTitle, { StateProps, OwnProps } from './PageTitle';

const mapStateToProps = (state): StateProps => {
	const mentionsCount = selectors.getMentionsCount()(state);
	const channels = selectors.getChannels()(state);
	return {
		activeChannel: channels.length > 1 ? channels[channels.length - 1] : null,
		unreadCount: mentionsCount,
	};
};

export default connect<StateProps, {}, OwnProps>(mapStateToProps)(PageTitle);
