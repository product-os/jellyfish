import { connect } from 'react-redux';
import { compose } from 'redux';
import { selectors } from '../../store';
import { withSetup } from '../SetupProvider';
import ViewLink from './ViewLink';

const mapStateToProps = (state, ownProps) => {
	const homeView = selectors.getHomeView()(state);
	return {
		user: selectors.getCurrentUser()(state),
		isHomeView: ownProps.card.id === homeView,
	};
};

export default compose<any>(withSetup, connect(mapStateToProps))(ViewLink);
