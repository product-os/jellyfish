import React from 'react';
import _ from 'lodash';
import skhema from 'skhema';
import memoize from 'memoize-one';
import { circularDeepEqual } from 'fast-equals';
import clone from 'deep-copy';
import { Select, SelectProps } from 'rendition';
import type { TypeContract } from 'autumndb';
import * as helpers from '../../../../../services/helpers';
import { Setup, withSetup } from '../../../../../components/SetupProvider';

// Do not include fields with array type (doesn't make sense to sort by an array), as well as the id, version, active, or type fields
const FIELDS_TO_OMIT: any[] = [
	{
		key: 'type',
		value: 'array',
	},
	{
		field: 'id',
	},
	{
		field: 'version',
	},
	{
		field: 'active',
	},
	{
		field: 'type',
	},
];

const PREFIX = 'Sort by: ';

const isSupportView = memoize((types) => {
	console.log('types', types);
	return _.find(types, {
		slug: 'support-thread',
	});
});

const getSortByOptions = (cardSchema, tailTypes) => {
	const tailSchemas = _.map(tailTypes, (tailType) => {
		console.log('TAILTYPES', tailTypes);
		return clone(_.get(tailType, ['data', 'schema'], {}));
	});

	// Merge generic card schema with current card schema to get top-level and data fields
	// TODO: Improve safety of skhema.merge so that it doesn't throw if the
	// skhemas can't be merged. That way we can merge all the typesSchemas
	// instead of just the first one.
	const fullSchema: any = skhema.merge([cardSchema, _.first(tailSchemas)]);

	const dataFieldPaths = helpers.getPathsInSchema(fullSchema, FIELDS_TO_OMIT);

	return _.map(dataFieldPaths, ({ path, title }) => {
		return {
			title: `${PREFIX}${title}`,
			value: _.join(path, '.'),
		};
	});
};

type SortByOption = {
	title: string;
	value: string;
};

interface SortByDropdownProps
	extends Setup,
		Omit<SelectProps<SortByOption>, 'options' | 'onChange'> {
	pageOptions: { sortBy: string | string[]; sortDir: 'desc' | 'asc' };
	tailTypes: TypeContract[];
	setSortByField: SelectProps<SortByOption>['onChange'];
}

export default withSetup(
	class SortByDropdown extends React.Component<SortByDropdownProps, any> {
		constructor(props: SortByDropdownProps) {
			super(props);
			this.state = {
				sortByOptions: [],
				cardSchema: {},

				// TODO remove this once we have support for sorting by linked cards
				isSupportView: true,
			};
			this.handleSortBySelectionChange =
				this.handleSortBySelectionChange.bind(this);
		}

		async componentDidMount() {
			const { tailTypes } = this.props;

			// TODO remove this once we have support for sorting by linked cards
			// if (isSupportView(tailTypes)) {
			// 	this.setState({
			// 		isSupportView: false, // enables sortBy dropdown in support but show no options
			// 	});
			// 	return;
			// }
			const {
				data: { schema: cardSchema },
			} = (await this.props.sdk.getBySlug('card@1.0.0')) as any;

			const results = getSortByOptions(cardSchema, tailTypes);
			console.log('state', this.state.sortByOptions);
			console.log('resulta', results);

			this.setState({
				sortByOptions: results,
				cardSchema,
			});
		}

		async componentDidUpdate({ tailTypes: prevTailTypes }) {
			const { tailTypes } = this.props;

			const prevTailTypeSlugs = _.map(prevTailTypes, 'slug');
			const tailTypeSlugs = _.map(tailTypes, 'slug');

			// If the tail types have changed, recalculate the sort by options
			// TODO remove check for support view once we have support for sorting by linked cards
			const cardSchemaCopy = this.state.cardSchema;
			if (
				!circularDeepEqual(tailTypeSlugs, prevTailTypeSlugs) &&
				!this.state.isSupportView
			) {
				const results = getSortByOptions(cardSchemaCopy, tailTypes);

				this.setState({
					sortByOptions: results,
				});
			}
		}

		handleSortBySelectionChange({ option: { value } }) {
			const valueAsList = value.split('.');
			this.props.setSortByField(valueAsList);
			console.log('insideHandleSortBySelectionChange');
		}

		render() {
			const {
				pageOptions: { sortBy: currentSortBy },
				setSortByField,
				tailTypes,
				...rest
			} = this.props;

			// TODO remove this once we have support for sorting by linked cards
			if (this.state.isSupportView) {
				// 	return null;
			}

			const currentValue = {
				value: _.join(currentSortBy, '.'),
			};
			console.log('STATE', this.state.sortByOptions);
			return (
				<Select
					{...rest}
					labelKey="title"
					valueKey="value"
					value={currentValue}
					options={this.state.sortByOptions}
					onChange={this.handleSortBySelectionChange}
				/>
			);
		}
	},
);
