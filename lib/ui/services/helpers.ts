import * as _ from 'lodash';
import * as moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import uuid = require('uuid/v4');
import { Card, Channel, JellyfishState } from '../../Types';
import { actionCreators } from '../app';

const PURPLE = '#8268c5';

const DEBUG =	!_.includes([
	'test',
], process.env.NODE_ENV);

export const debug = (...params: any[]) => {
	if (DEBUG) {
		console.log('%cjellyfish:ui', `color: ${PURPLE};`, ...params);
	}
};

interface StateFromProps {
	appState: JellyfishState;
}

interface DispatchFromProps {
	actions: typeof actionCreators;
}

export interface ConnectedComponentProps extends StateFromProps, DispatchFromProps {}

const mapStateToProps = (state: JellyfishState): StateFromProps => ({
	appState: state,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const connectComponent = <P extends ConnectedComponentProps>(component: React.ComponentType<P>) => {
	return connect(mapStateToProps, mapDispatchToProps)<P>(component);
};

export const createChannel = (data: Channel['data']): Channel => ({
	id: uuid(),
	type: 'channel',
	tags: [],
	links: [],
	active: true,
	data: {
		...data,
	},
});

/**
 * @summary Get the current timestamp
 * @function
 * @public
 *
 * @returns {String} RFC 3339 timestamp
 *
 * @example
 * const timestamp = helpers.getCurrentTimestamp()
 */
export const getCurrentTimestamp = () => {
	const currentDate = new Date();
	return currentDate.toISOString();
};

export const getTypeFromViewCard = (card: any) => {
	// Default to the `card` type, which will give a sensible schema
	let value: string = 'card';

	if (card.data.allOf) {
		for (const item of card.data.allOf) {
			let found = _.get(item.schema, 'properties.type.const');
			if (found) {
				value = found;
				break;
			}
			if (item.schema.anyOf) {
				for (const subschema of item.schema.anyOf) {
					found = _.get(subschema, 'properties.type.const');
					if (found) {
						break;
					}
				}
			}
			if (found) {
				value = found;
				break;
			}
		}
	}

	if (!value && card.data.oneOf) {
		for (const item of card.data.allOf) {
			const found = _.get(item.schema, 'properties.type.const');
			if (found) {
				value = found;
				break;
			}
		}
	}

	return value;
};

const TODAY = moment().startOf('day');
const isToday = (momentDate: moment.Moment)  => {
	return momentDate.isSame(TODAY, 'd');
};

export const formatTimestamp = _.memoize((stamp: string): string => {
	const momentDate = moment(stamp);
	if (isToday(momentDate)) {
		return momentDate.format('k:mm');
	}

	return momentDate.format('ddd Do, YYYY k:mm');
});

export const findUsernameById = (users: Card[], id: string) => {
		const actor = _.find(users, { id });
		return actor ?
			actor.slug!.replace('user-', '') :
			'unknown user';
};
