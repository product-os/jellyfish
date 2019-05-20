import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	actionCreators
} from '../../core'
import CardLinker from './CardLinker'

const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addChannel: bindActionCreators(actionCreators.addChannel, dispatch)
		}
	}
}

export default connect(null, mapDispatchToProps)(CardLinker)
