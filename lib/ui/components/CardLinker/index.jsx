import _ from 'lodash'
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
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'addNotification',
				'createLink',
				'queryAPI'
			]), dispatch)
	}
}

export default connect(null, mapDispatchToProps)(CardLinker)
