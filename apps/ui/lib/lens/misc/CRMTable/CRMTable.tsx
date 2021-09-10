/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import * as React from 'react';
import { Box, Button, Txt } from "rendition";
import { helpers, Link } from "@balena/jellyfish-ui-components";
import { CardTable } from "../Table/CardTable";
import {
	model as modelFunction,
	transformers,
} from "../../../autoui/models/crmModel";

const CRMTable = (props) => {
	const openCreateChannel = (item) => {
		const { allTypes, activeLoop, actions, tail } = props;
		const accountType = helpers.getType("account", allTypes);
		const opportunity = _.find(tail, { id: item.id });
		if (!opportunity) {
			console.warn(`Could not find opportunity ${item.id}`);
			return;
		}
		actions.addChannel({
			head: {
				types: accountType,
				seed: {
					markers: opportunity.markers,
					loop: opportunity.loop || activeLoop,
				},
				onDone: {
					action: "link",
					targets: [opportunity],
				},
			},
			format: "create",
			canonical: false,
		});
	};

	const initColumns = () => {
		return [
			{
				field: "Account",
				sortable: true,
				render: (account, item) => {
					if (!account) {
						return (
							<Button
								mr={2}
								success
								// TODO: This should open a linked account create modal
								onClick={() => openCreateChannel(item)}
							>
								Add new linked Account
							</Button>
						);
					}

					return (
						<Box>
							<Link to={helpers.appendToChannelPath(props.channel, account)}>
								{account.name}
							</Link>
							<Txt color="text.light" fontSize="0">
								{_.get(account, ["data", "type"])}
							</Txt>
						</Box>
					);
				},
			},
		];
	};

	const generateTableData = () => {
		return props.tail
			? _.map(props.tail, (opportunity) => {
					const account = _.find(
						_.get(opportunity, ["links", "is attached to"])
					);

					const update = _.find(
						_.get(opportunity, ["links", "has attached element"]),
						(linkedCard) => {
							return ["update", "update@1.0.0"].includes(linkedCard.type);
						}
					);

					return {
						id: opportunity.id,
						slug: _.get(opportunity, ["slug"]),

						Opportunity: _.get(opportunity, ["name"]),
						Account: account,
						"Due Date": _.get(opportunity, ["data", "dueDate"]),
						Value: _.get(opportunity, ["data", "value"]),
						"Estimated ARR": _.get(opportunity, ["data", "totalValue"]),
						Stage: opportunity,
						"Account Status": _.get(account, ["data", "status"]),
						Usecase: _.get(opportunity, ["data", "usecase"]),
						"Device Type": opportunity.data.device,
						"Account Usecase": _.get(account, ["data", "usecase"]),
						"Account Industry": _.get(account, ["data", "industry"]),
						"Account Location": _.get(account, ["data", "location"]),
						Tags: _.get(opportunity, ["tags"]),
						type: _.get(opportunity, ["type"]),

						"Last updated": _.get(update, ["data", "timestamp"], null),
					};
			  })
			: null;
	};

	const model = modelFunction("opportunity");

	return (
		<CardTable
			{...props}
			generateData={generateTableData}
			modelProp={model}
			transformersProp={transformers}
		/>
	);
};

export default CRMTable;
