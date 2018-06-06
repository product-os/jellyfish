import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import uuid = require('uuid/v4');
import * as jsonSchema from '../../core/json-schema';
import { Card, Channel, JellyfishState } from '../../Types';
import { actionCreators, sdk } from '../app';

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

/**
 * @summary Get the schema of a view card
 * @function
 * @private
 *
 * @param {Object} card - view card
 * @returns {(Object|Null)} schema
 *
 * @example
 * const card = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'view-all')
 * const schema = permissionFilter.getViewSchema(card)
 * console.log(schema)
 */
export const getViewSchema = (card: Card) => {
	if (!card) {
		return null;
	}

	const conjunctions = _.map(_.get(card, [ 'data', 'allOf' ]), 'schema');
	const disjunctions = _.map(_.get(card, [ 'data', 'anyOf' ]), 'schema');

	if (_.isEmpty(conjunctions) && _.isEmpty(disjunctions)) {
		return null;
	}

	if (!_.isEmpty(disjunctions)) {
		conjunctions.push({
			anyOf: disjunctions,
		});
	}

	return jsonSchema.merge(conjunctions);
};

export const loadSchema = async (query: string | Card | JSONSchema6) => {
	if (_.isString(query)) {
		return await sdk.card.get(query).toPromise()
			.then(getViewSchema);
	}

	if (query.type === 'view') {
		return getViewSchema(query as Card);
	}

	return query as JSONSchema6;
};
