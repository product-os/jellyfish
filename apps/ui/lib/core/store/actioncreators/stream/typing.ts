import * as _ from 'lodash';
import actions from '../../actions';
const typingTimeouts = {};

export const streamTyping = (dispatch, payload) => {
	if (
		typingTimeouts[payload.card] &&
		typingTimeouts[payload.card][payload.user]
	) {
		clearTimeout(typingTimeouts[payload.card][payload.user]);
	}

	dispatch({
		type: actions.USER_STARTED_TYPING,
		value: {
			card: payload.card,
			user: payload.user,
		},
	});

	_.set(
		typingTimeouts,
		[payload.card, payload.user],
		setTimeout(() => {
			dispatch({
				type: actions.USER_STOPPED_TYPING,
				value: {
					card: payload.card,
					user: payload.user,
				},
			});
		}, 2 * 1000),
	);
};
