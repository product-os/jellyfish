import React from 'react';
import _ from 'lodash';
import pluralize from 'pluralize';
import { Tab, Txt, Select, TxtProps } from 'rendition';
import styled from 'styled-components';
import useDebounce from '../../../hooks/use-debounce';
import * as helpers from '../../../services/helpers';
import type { Contract, TypeContract } from 'autumndb';
import type { JSONSchema } from 'rendition/dist/components/Renderer/types';
import type { BoundActionCreators, ChannelContract } from '../../../types';
import Segment from '../Segment';
import { actionCreators } from '../../../store';
import { useSetup } from '../../../components';
import type { RelationshipContract } from 'autumndb';

export const SLUG = 'RELATIONSHIPS_TAB';

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

export const getRelationships = (
	relationships: RelationshipContract[],
	typeSlug: string,
) => {
	const linkRelationships: LinkRelationship[] = [];
	const typeSlugBase = helpers.getTypeBase(typeSlug);

	// Ensure uniqueness as self-referencing relationships result in multiple array elements
	// Example: pattern-relates-to-pattern
	return _.uniqWith(
		_.sortBy(
			relationships.reduce((acc, relationship) => {
				if (relationship.data.from.type === typeSlugBase) {
					acc.push({
						title: pluralize(relationship.data.title),
						link: relationship.name!,
						type: relationship.data.to.type,
						count: 0,
					});
				}
				if (relationship.data.to.type === typeSlugBase) {
					acc.push({
						title: pluralize(relationship.data.inverseTitle),
						link: relationship.data.inverseName!,
						type: relationship.data.from.type,
						count: 0,
					});
				}
				return acc;
			}, linkRelationships),
			['type', 'title'],
		),
		_.isEqual,
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

export interface OwnProps {
	card: Contract;
	channel: ChannelContract;
}

export interface StateProps {
	types: TypeContract[];
	lensState: {
		activeIndex?: number;
	};
	relationships: RelationshipContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

type Props = StateProps & DispatchProps & OwnProps;

export const RelationshipsTab: React.FunctionComponent<Props> = ({
	actions,
	card,
	channel,
	lensState,
	relationships,
}) => {
	const { sdk } = useSetup()!;
	const [activeRelationship, setActiveRelationship] =
		React.useState<LinkRelationship>();
	const [linkRelationships, setRelationships] = React.useState<
		LinkRelationship[]
	>(getRelationships(relationships, card.type));
	const [searchTerm, setSearchTerm] = React.useState<string>();
	const debouncedSearchTerm = useDebounce(searchTerm, 300);

	const filteredRelationships = React.useMemo(() => {
		if (!debouncedSearchTerm) {
			return linkRelationships;
		}
		const searchRE = new RegExp(debouncedSearchTerm, 'i');
		return linkRelationships.filter((relationship) => {
			return _.some(_.values(relationship) as string[], (field) => {
				return searchRE.test(field);
			});
		});
	}, [linkRelationships, debouncedSearchTerm]);

	React.useEffect(() => {
		if (lensState.hasOwnProperty('activeIndex')) {
			const rel = filteredRelationships[lensState.activeIndex!];
			setActiveRelationship(rel);
		}
	}, []);

	// Fetch relationships as view data when the component loads
	React.useEffect(() => {
		Promise.all(
			linkRelationships.map(async (relationship) => {
				const schema = {
					description: `Fetch all contracts linked to ${card.slug}`,
					type: 'object',
					required: ['id', 'type'],
					properties: {
						id: {
							const: card.id,
						},
					},
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

				const [result] = await sdk.query(schema, { limit: 1 });

				return {
					...relationship,
					count:
						result && result.links ? result.links[relationship.link].length : 0,
				};
			}),
		)
			.then((newRelationships) => {
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
			})
			.catch((error) => console.error(error));
	}, []);

	const changeActiveTab = ({ option }) => {
		const activeIndex = _.findIndex(filteredRelationships, option);
		// The intention here is to persist the active index per type
		// It's a bit hacky, because technically this component is not a Lens
		// TODO: Find a cleaner way of persisting tab selection between types
		const target = card.type;
		actions.setLensState(SLUG, target, {
			activeIndex,
		});
		setActiveRelationship(option as LinkRelationship);
	};

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
					onChange={changeActiveTab}
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
				<Segment channel={channel} card={card} segment={activeRelationship} />
			)}
		</Tab>
	);
};
