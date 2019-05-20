import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	selectors,
	actionCreators
} from '../../core'
import ViewLink from './ViewLink'

const mapStateToProps = (state, ownProps) => {
	return {
		subscription: selectors.getSubscription(state, ownProps.card.id),
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators({
		saveSubscription: actionCreators.saveSubscription,
		setDefault: actionCreators.setDefault
	}, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewLink)
