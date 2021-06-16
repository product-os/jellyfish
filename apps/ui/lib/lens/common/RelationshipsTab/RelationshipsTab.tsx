/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import pluralize from 'pluralize';
import { Tab, Txt, Select, TxtProps } from 'rendition';
import styled from 'styled-components';
import { helpers, useDebounce } from '@balena/jellyfish-ui-components';
import { linkConstraints } from '@balena/jellyfish-client-sdk';
import Segment from '../Segment';
import { Contract, TypeContract } from '@balena/jellyfish-types/build/core';
import { JSONSchema } from 'rendition/dist/components/Renderer/types';

const TabTitleSelect = styled(Select)`
	input {
		height: 24px;
		padding: 0;
		padding-left: 0;
		padding-bottom: ${(props) => {
			return helpers.px(props.theme.space[1]);
		}};
	}
`;

interface LinkRelationship {
	count: number;
	title: string;
	link: string;
	type: string;
}

export const getViewId = (id: string): string => {
	return `${id}-relationships`;
};

export const getRelationships = (typeSlug: string) => {
	const relationships: LinkRelationship[] = [];
	const typeSlugBase = helpers.getTypeBase(typeSlug);
	return _.sortBy(
		linkConstraints.reduce((acc, constraint) => {
			if (constraint.data.from === typeSlugBase) {
				acc.push({
					title: pluralize(constraint.data.title),
					link: constraint.name,
					type: constraint.data.to,
					count: 0,
				});
			}
			return acc;
		}, relationships),
		['type', 'title'],
	);
};

interface LinkDisplayProps extends TxtProps {
	option?: LinkRelationship;
}

const LinkDisplay: React.FunctionComponent<LinkDisplayProps> = React.memo(
	({ option, ...rest }) => {
		return option ? (
			<Txt
				data-test="reltab_option"
				data-test-count={option.count}
				data-test-id={helpers.slugify(`${option.link}-${option.type}`)}
				{...rest}
			>
				{`${option.title}${option.count ? ` (${option.count})` : ''}`}
			</Txt>
		) : (
			<Txt data-test="reltab_placeholder" {...rest} color="text.light">
				Links...
			</Txt>
		);
	},
);

export interface RelationshipsTabProps {
	viewData: any;
	card: Contract;
	types: TypeContract[];
	actions: {
		loadViewData: (query: JSONSchema, options: any) => void;
	};
}

export const RelationshipsTab: React.FunctionComponent<RelationshipsTabProps> =
	({ viewData, card, types, actions }) => {
		const [activeRelationship, setActiveRelationship] =
			React.useState<LinkRelationship>();
		const [relationships, setRelationships] = React.useState<
			LinkRelationship[]
		>(getRelationships(card.type));
		const [searchTerm, setSearchTerm] = React.useState<string>();
		const debouncedSearchTerm = useDebounce(searchTerm, 300);

		const filteredRelationships = React.useMemo(() => {
			if (!debouncedSearchTerm) {
				return relationships;
			}
			const searchRE = new RegExp(debouncedSearchTerm, 'i');
			return relationships.filter((relationship) => {
				return _.some(_.values(relationship) as string[], (field) => {
					return searchRE.test(field);
				});
			});
		}, [relationships, debouncedSearchTerm]);

		// When the view data comes in, use it to populate the counts in the relationships
		React.useEffect(() => {
			if (!viewData || !viewData.length) {
				return;
			}
			const newRelationships = _.cloneDeep(relationships);
			const [cardWithLinks] = viewData;
			if (cardWithLinks) {
				newRelationships.forEach((relationship) => {
					relationship.count = 0;
					const links = _.get(cardWithLinks, ['links', relationship.link]);
					_.forEach(links, (link) => {
						const linkTypeBase = helpers.getTypeBase(link.type);
						if (
							relationship.type === linkTypeBase ||
							relationship.type === '*'
						) {
							relationship.count += 1;
						}
					});
				});
			}
			setRelationships(
				_.orderBy(
					newRelationships,
					['count', 'type', 'title'],
					['desc', 'asc', 'asc'],
				),
			);
			if (activeRelationship) {
				const newActiveRelationship = _.find<LinkRelationship>(
					newRelationships,
					_.pick(activeRelationship, 'type', 'link', 'title'),
				);
				if (newActiveRelationship) {
					setActiveRelationship(newActiveRelationship);
				}
			}
		}, [viewData]);

		// Fetch relationships as view data when the component loads
		React.useEffect(() => {
			const query: JSONSchema = {
				description: `Fetch all contracts linked to ${card.slug}`,
				type: 'object',
				// HACK: Include type here to force linked contracts to return type (see issue #6602)
				required: ['id', 'type'],
				properties: {
					id: {
						const: card.id,
					},
				},
				anyOf: relationships
					.map((relationship) => {
						return {
							$$links: {
								[relationship.link]: {
									type: 'object',
									required: ['type'],
									additionalProperties: false,
									properties:
										relationship.type === '*'
											? {}
											: {
													type: {
														const: `${relationship.type}@1.0.0`,
													},
											  },
								},
							},
						} as JSONSchema;
					})
					.concat(true as JSONSchema),
			};
			actions.loadViewData(query, { limit: 1, viewId: getViewId(card.id) });
		}, []);

		return (
			<Tab
				title={
					<TabTitleSelect
						mr={-3}
						data-test="reltab_select"
						plain
						placeholder="Links..."
						searchPlaceholder="Search for links..."
						emptySearchMessage="No matching links"
						onSearch={setSearchTerm}
						onClose={() => setSearchTerm('')}
						onChange={({ option }) => {
							setActiveRelationship(option as LinkRelationship);
						}}
						value={activeRelationship}
						options={filteredRelationships || []}
						valueLabel={
							<LinkDisplay
								option={activeRelationship}
								pb={1}
								data-test="reltab_value"
							/>
						}
						labelKey={(option) => <LinkDisplay option={option} />}
					/>
				}
				key="relationships"
				data-test="card-relationships-tab"
			>
				{activeRelationship && (
					<Segment
						card={card}
						segment={activeRelationship}
						types={types}
						actions={actions}
					/>
				)}
			</Tab>
		);
	};
