import _ from 'lodash';
import React from 'react';
import skhema from 'skhema';
import * as helpers from '../../../services/helpers';
import { Link } from '../../../components';
import { format, parseISO } from 'date-fns';
import flatten from 'flat';
import ContractTable from '../Table/ContractTable';

const PAGE_SIZE = 25;

// Do not include markdown or mermaid fields in our table
const OMISSIONS: any[] = [
	{
		key: 'format',
		value: 'markdown',
	},
	{
		key: 'format',
		value: 'mermaid',
	},
];

export default class CardTable extends ContractTable {
	static defaultProps;

	constructor(props) {
		super(props);
	}

	generateTableColumns() {
		const { channel, allTypes, lensState, tailTypes } = this.props;

		const typeSchemas = _.map(tailTypes, 'data.schema');

		const baseCardSchema = _.find(allTypes, {
			slug: 'card',
		}).data.schema;

		// Select the "default" schema cards from the "card" definition, as they may
		// not be explicitly defined on the specified type card
		const defaultSchema: any = _.pick(baseCardSchema, [
			'properties.slug',
			'properties.created_at',
		]);

		// TODO: Improve safety of skhema.merge so that it doesn't throw if the
		// skhemas can't be merged. That way we can merge all the typesSchemas
		// instead of just the first one.
		// TODO: Clean up the user contract schema!
		const typeSchema = _.omit(_.first(typeSchemas), [
			'properties.markers',
			'properties.data.properties.hash',
			'properties.data.properties.roles',
			'properties.data.properties.avatar',
			'properties.data.properties.status',
			'properties.data.properties.oauth',
			'properties.data.properties.profile.properties.about',
			'properties.data.properties.profile.properties.activeLoop',
			'properties.data.properties.profile.properties.disableNotificationSound',
			'properties.data.properties.profile.properties.homeView',
			'properties.data.properties.profile.properties.name',
			'properties.data.properties.profile.properties.sendCommand',
			'properties.data.properties.profile.properties.starredViews',
			'properties.data.properties.profile.properties.startDate',
			'properties.data.properties.profile.properties.type',
			'properties.data.properties.profile.properties.title',
		]);

		const paths = helpers.getPathsInSchema(
			skhema.merge([defaultSchema, typeSchema]) as any,
			OMISSIONS,
		);

		paths.push({
			title: 'Improvements',
			path: ['links', 'owns'],
		});

		// For some columns like card.name we use a render function
		const renderers = {
			name: (name, item) => {
				return (
					<Link to={helpers.appendToChannelPath(channel, item)}>
						{name || 'click to view'}
					</Link>
				);
			},
			slug: (slug, item) => {
				return (
					<Link to={helpers.appendToChannelPath(channel, item)}>
						@{slug.slice(5)}
					</Link>
				);
			},
			created_at: (timestamp, _item) => {
				return format(parseISO(timestamp), 'MM/dd/yyyy hh:mm:ss');
			},
			updated_at: (timestamp, _item) => {
				return timestamp
					? format(parseISO(timestamp), 'MM/dd/yyyy hh:mm:ss')
					: null;
			},
		};

		return _.map(paths, ({ title, path }) => {
			const field = _.join(path, '.');
			const render = renderers[field];
			return {
				label: title,
				field,
				sortable: true,
				render,
				active: _.get(
					_.find(lensState.columns, {
						field,
					}),
					['active'],
					true,
				),
			};
		});
	}

	generateTableData() {
		return _.map(this.props.tail, (contract) => {
			const improvements = (contract.links?.owns || [])
				.concat(contract.links?.['is dedicated to'] || [])
				.concat(contract.links?.['contributes to'] || [])
				.concat(contract.links?.guides || []);
			return flatten({
				...contract,
				links: {
					...contract.links,
					owns: improvements.length,
				},
			});
		});
	}
}

CardTable.defaultProps = {
	rowKey: 'id',
};
