import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Heading } from 'rendition';
import { LensRendererProps } from '../../../types';
import { UI_SCHEMA_MODE } from '../../schema-util';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';
import CardFields from '../../../components/CardFields';
import * as helpers from '../../../services/helpers';
import { Contract, TypeContract } from '@balena/jellyfish-types/build/core';
import { JsonSchema } from '@balena/jellyfish-types';
import { ViewFooter } from '../../common/ViewFooter';
import { JellyfishCursor } from '@balena/jellyfish-client-sdk/build/cursor';
import { Setup, withSetup } from '../../../components/SetupProvider';

export type OwnProps = LensRendererProps & {
	types: TypeContract[];
};

type Props = OwnProps & Setup;

interface State {
	milestones: Contract[];
}

export default withSetup(
	class Improvement extends React.Component<Props, State> {
		cursor: JellyfishCursor | null = null;

		constructor(props: Props) {
			super(props);
			this.state = {
				milestones: [],
			};
		}

		async componentDidMount() {
			// JSON Schema that matches type of improvement
			const milestoneQuery: JsonSchema = {
				$$links: {
					'is attached to': {
						type: 'object',
						properties: {
							id: {
								const: this.props.card.id,
							},
						},
					},
				},
				type: 'object',
				properties: {
					type: {
						const: 'milestone@1.0.0',
					},
				},
			};

			this.cursor = this.props.sdk.getCursor(milestoneQuery, {
				sortBy: 'created_at',
			});
			const milestones = await this.cursor!.query();
			while (this.cursor!.hasNextPage()) {
				const results = await this.cursor!.nextPage();
				milestones.push(...results);
			}
			this.setState({ milestones });
			this.cursor!.onUpdate(((response: {
				data: { type: any; id: any; after: any };
			}) => {
				const { id, after } = response.data;

				// If card is null then it has been set to inactive or deleted
				if (after === null) {
					this.setState((prevState) => {
						return {
							milestones: prevState.milestones.filter(
								(contract) => contract.id !== id,
							),
						};
					});
					return;
				} else {
					// Otherwise perform an upsert
					this.setState((prevState) => {
						const index = _.findIndex(prevState.milestones, { id });
						// If an item is found then replace it
						if (index > -1 && prevState.milestones) {
							prevState.milestones.splice(index, 1, after);
							return {
								milestones: prevState.milestones,
							};
						}
						// Otherwise add it to the results
						return {
							milestones: prevState.milestones.concat(after),
						};
					});
				}
			}) as any);
		}

		shouldComponentUpdate(nextProps, nextState) {
			return (
				!circularDeepEqual(nextState, this.state) ||
				!circularDeepEqual(nextProps, this.props)
			);
		}

		render() {
			const { card, channel, types, user } = this.props;
			const { milestones } = this.state;
			const type = helpers.getType(card.type, types);

			let snippetLens;

			if (milestones.length) {
				const { getLenses } = require('../../');
				const lenses = getLenses('snippet', milestones[0], user);
				snippetLens = lenses[0];
			}

			return (
				<TabbedContractLayout card={card} channel={channel}>
					<CardFields
						card={card}
						type={type}
						viewMode={UI_SCHEMA_MODE.fields}
					/>
					<Heading.h2>Milestones</Heading.h2>
					{Boolean(snippetLens) && (
						<Box mx={-3}>
							{milestones.map((c) => {
								return (
									<snippetLens.data.renderer
										card={c}
										types={this.props.types}
									/>
								);
							})}

							<ViewFooter
								types={[helpers.getType(milestones[0].type, types)]}
							/>
						</Box>
					)}
				</TabbedContractLayout>
			);
		}
	},
);
