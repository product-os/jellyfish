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
			addChannel: bindActionCreators(actionCreators.addChannel, dispatch),
			queryAPI: bindActionCreators(actionCreators.queryAPI, dispatch)
		}
	}
}

export default connect(null, mapDispatchToProps)(CardLinker)
