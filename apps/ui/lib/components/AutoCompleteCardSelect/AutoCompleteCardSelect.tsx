/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-underscore-dangle */

import _ from 'lodash';
import React from 'react';
import skhema from 'skhema';
import AsyncSelect from 'react-select/async';
import { Badge, Flex, Txt } from 'rendition';
import debounce from 'debounce-promise';
import { helpers } from '@balena/jellyfish-ui-components';
import { core } from '@balena/jellyfish-types';

const preventClickPropagation = (event: any) => {
	event.stopPropagation();
	event.preventDefault();
};

export class AutoCompleteCardSelect extends React.Component<any, any> {
	container: any;
	_isMounted: boolean = false;

	constructor(props: any) {
		super(props);
		this.getTargets = debounce(this.getTargets.bind(this), 500);
		this.onChange = this.onChange.bind(this);
	}

	createContainer() {
		this.container = document.createElement('div');
		this.container.addEventListener('mousedown', preventClickPropagation);
		document.body.appendChild(this.container);
	}

	disposeContainer() {
		this.container.parentNode.removeChild(this.container);
		this.container.removeEventListener('mousedown', preventClickPropagation);
		this.container = null;
	}

	componentDidMount() {
		this._isMounted = true;
		this.createContainer();
	}

	componentWillUnmount() {
		this._isMounted = false;
		this.disposeContainer();
	}

	componentDidUpdate(prevProps: { cardType: any }) {
		// If the card type is changed, we should reset
		if (!_.isEqual(prevProps.cardType, this.props.cardType)) {
			this.props.onChange(null);
		}
	}

	onChange(option: any) {
		this.props.onChange(option);
	}

	async getTargets(value: string) {
		const { getQueryFilter, cardFilter, cardType, types, sdk } = this.props;
		const cardTypes = _.castArray(cardType);

		let queryFilter: any = null;
		if (getQueryFilter) {
			queryFilter = getQueryFilter(value);
		} else if (value) {
			queryFilter = {
				type: 'object',
				anyOf: _.compact(
					_.flatMap(cardTypes, (cardTypeSlug) => {
						// Retrieve the target type of the selected link
						const typeCard = _.find(types, {
							slug: helpers.getTypeBase(cardTypeSlug),
						});
						const baseFilter = skhema.merge([
							{
								type: 'object',
								required: ['type'],
								properties: {
									type: {
										const: `${typeCard.slug}@${typeCard.version}`,
									},
								},
							},
							cardFilter,
						]);
						const searchFilter = helpers.createFullTextSearchFilter(
							typeCard.data.schema,
							value,
							{
								fullTextSearchFieldsOnly: true,
								includeIdAndSlug: true,
							},
						);
						if (!searchFilter) {
							return null;
						}
						return _.map(searchFilter.anyOf, (subSchema: any) => {
							return skhema.merge([baseFilter, subSchema]);
						});
					}),
				),
			};
		} else {
			queryFilter = {
				type: 'object',
				required: ['type'],
				properties: {
					type: {
						enum: cardTypes.map((cardTypeSlug) => {
							const typeCard = _.find(types, {
								slug: helpers.getTypeBase(cardTypeSlug),
							});
							return `${typeCard.slug}@${typeCard.version}`;
						}),
					},
				},
			};
		}

		// Query the API for results and set them to state so they can be accessed
		// when an option is selected
		const results = await sdk.query(queryFilter, {
			limit: 50,
		});

		// If the card type was changed while the request was in-flight, we should discard these results
		if (!_.isEqual(cardType, this.props.cardType)) {
			return [];
		}

		// Return the results in a format understood by the AsyncSelect component
		return results;
	}

	getOptionValue = (card: core.Contract) => {
		return card.id;
	};

	formatOptionLabel = (card) => {
		const { types, cardType } = this.props;

		const typeCardIndex = types.findIndex((type) => {
			return type.slug === helpers.getTypeBase(card.type);
		});

		const typeName = types[typeCardIndex]?.name;
		const label = card.name || card.slug || card.id;

		return (
			<Flex alignItems="center" justifyContent="center">
				{_.isArray(cardType) && typeName && (
					<Badge shade={typeCardIndex} mr={2}>
						{typeName}
					</Badge>
				)}
				<Txt
					tooltip={label}
					style={{
						flex: 1,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{label}
				</Txt>
			</Flex>
		);
	};

	render() {
		const {
			actions,
			analytics,
			cardType,
			sdk,
			types,
			onChange,
			value,
			...rest
		} = this.props;

		return (
			<AsyncSelect
				key={cardType}
				classNamePrefix="jellyfish-async-select"
				value={value}
				isClearable
				defaultOptions
				onChange={this.onChange}
				loadOptions={this.getTargets}
				menuPortalTarget={this.container}
				styles={{
					// Ensure the menu portal shows on top of a modal
					menuPortal: (base: any) => {
						return {
							...base,
							zIndex: 100,
						};
					},
				}}
				getOptionValue={this.getOptionValue}
				formatOptionLabel={this.formatOptionLabel}
				{...rest}
			/>
		);
	}

	static defaultProps = {
		types: [],
	};
}
