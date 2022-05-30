import { connect } from 'react-redux';
import { selectors } from '../../store';
import ChannelNotFound from './ChannelNotFound';

const mapStateToProps = (state) => {
	return {
		// Only display a home link if this is the only channel (apart from the home channel)
		displayHomeLink: selectors.getChannels()(state).length === 2,
	};
};

export default connect(mapStateToProps)(ChannelNotFound);
