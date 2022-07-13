import { connect } from 'react-redux';
import { selectors } from '../../store';
import CardLinker from './CardLinker';

const mapStateToProps = (state: any) => {
	return {
		activeLoop: selectors.getActiveLoop()(state),
		relationships: selectors.getRelationships()(state),
	};
};

export default connect(mapStateToProps)(CardLinker);
