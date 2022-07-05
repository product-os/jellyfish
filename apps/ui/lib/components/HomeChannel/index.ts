import _ from 'lodash';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { withTheme } from 'styled-components';
import { bindActionCreators } from '../../bindactioncreators';
import { withResponsiveContext } from '../../hooks/use-responsive-context';
import { actionCreators, selectors } from '../../store';
import HomeChannel, {
	StateProps,
	DispatchProps,
	OwnProps,
} from './HomeChannel';

const mapStateToProps = (state): StateProps => {
	return {
		channels: selectors.getChannels()(state),
		codename: selectors.getAppCodename()(state),
		orgs: selectors.getOrgs()(state),
		types: selectors.getTypes()(state),
		activeLoop: selectors.getActiveLoop()(state),
		isChatWidgetOpen: selectors.getChatWidgetOpen()(state),
		user: selectors.getCurrentUser()(state),
		homeView: selectors.getHomeView()(state),
		version: selectors.getAppVersion()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(withTheme<any>(withRouter(withResponsiveContext(HomeChannel))));
