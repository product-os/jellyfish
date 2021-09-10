/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import React from "react";
import {
	Box,
	AutoUICollection,
	AutoUIAction,
	autoUIGetModelForCollection,
	autoUIRunTransformers,
} from "rendition";
import styled from "styled-components";
import { CSVLink } from "react-csv";
import flatten from "flat";
import { LinkModal, UnlinkModal } from "../../../components/LinkModal";
import {
	model as modelFunction,
	transformers,
} from "../../../autoui/models/defaultModel";
import { formats } from "../../../autoui/formats";
import getHistory from "../../../../lib/services/history";
import { getCsvData } from "../../full/View/Header";

const CSVLinkWrapper = styled(Box)`
	a {
		display: none;
	}
`;

export const CardTable = (props) => {
	const {
		allTypes,
		generateData,
		actions,
		channel,
		activeLoop,
		tailTypes,
		modelProp,
		transformersProp,
	} = props;

	console.log("*** type", tailTypes[0]);

	const [csvData, setCsvData] = React.useState<any>(null);
	const csvHeaders = React.useMemo(
		() =>
			!csvData
				? []
				: csvData.length
				? Object.keys(csvData[0]).map((key) => {
						return {
							key,
							label: key.split(".").pop(),
						};
				  })
				: [],
		[csvData]
	);
	const csvName = React.useMemo(
		() => `${channel.data.head.slug}_${new Date().toISOString()}.csv`,
		[channel, csvHeaders]
	);
	const csvLinkRef = React.useRef<any>(null);

	React.useEffect(() => {
		if (csvData && csvData.length && csvHeaders.length) {
			setCsvData([]);
		}
	}, [csvName]);

	React.useEffect(() => {
		if (csvData && !csvData.length) {
			csvLinkRef.current?.link.click();
		}
	}, [csvData]);

	const generateTableData = () => {
		return _.map(props.tail, flatten);
	};

	const data = generateData ? generateData() : generateTableData();

	console.log("*** data", data);

	const baseCardSchema = _.find(allTypes, {
		slug: "card",
	}).data.schema;

	// Select the "default" schema cards from the "card" definition, as they may
	// not be explicitly defined on the specified type card
	const defaultSchema: any = _.pick(baseCardSchema, [
		"properties.name",
		"properties.id",
		"properties.slug",
		"properties.created_at",
		"properties.updated_at",
	]);

	const type = tailTypes[0];

	const model = modelProp || modelFunction(type, defaultSchema);

	console.log("*** model", model);

	const onAddCard = React.useCallback(async () => {
		await actions.addCard(channel, type, {
			synchronous: type.slug === "thread",
		});
	}, [actions.addCard, channel, type]);

	const onCreateNewElementToLinkTo = React.useCallback(
		async (affectedEntries) => {
			await actions.addChannel({
				head: {
					seed: {
						markers: channel.data.head.markers,
						loop: channel.data.head.loop || activeLoop,
					},
					onDone: {
						action: "link",
						targets: affectedEntries,
					},
				},
				format: "create",
				canonical: false,
			});
		},
		[channel, activeLoop]
	);

	const memoizedData = React.useMemo(
		() =>
			autoUIRunTransformers(data, transformersProp || transformers, {
				model,
			}),
		[model, data, transformers]
	);

	const memoizedModel = React.useMemo(
		() => autoUIGetModelForCollection(model),
		[model]
	);

	const memoizedActions: Array<AutoUIAction<any>> = React.useMemo(
		() => [
			{
				title: `Add ${type.name || type.slug}`,
				type: "create",
				renderer: () => null,
				actionFn: () => {
					onAddCard();
				},
			},
			{
				title: "Link to existing element",
				type: "update",
				renderer: ({ onDone, affectedEntries }) => {
					return (
						<LinkModal
							cards={affectedEntries}
							targetTypes={allTypes}
							onHide={() => onDone(true)}
						/>
					);
				},
			},
			{
				title: "Unlink from existing element",
				type: "update",
				renderer: ({ onDone, affectedEntries }) => {
					return (
						<UnlinkModal cards={affectedEntries} onHide={() => onDone(true)} />
					);
				},
			},
			{
				title: "Create a new element to link to",
				type: "update",
				renderer: () => {
					return null;
				},
				actionFn: ({ affectedEntries }) => {
					onCreateNewElementToLinkTo(affectedEntries);
				},
			},
			{
				title: "Download as CSV",
				type: "update",
				renderer: () => null,
				actionFn: ({ affectedEntries }) => {
					setCsvData(getCsvData(affectedEntries));
				},
			},
		],
		[
			type,
			channel,
			allTypes,
			onAddCard,
			csvLinkRef,
			csvData,
			csvHeaders,
			csvName,
		]
	);

	return (
		<Box m={3}>
			<AutoUICollection<any>
				model={memoizedModel}
				data={memoizedData}
				actions={memoizedActions}
				getBaseUrl={(entity) =>
					`${getHistory.location.pathname}/${entity.slug}${
						entity.version ? `@${entity.version}` : ""
					}`
				}
				formats={formats}
			/>
			<CSVLinkWrapper>
				<CSVLink
					data={csvData ?? []}
					headers={csvHeaders}
					filename={csvName}
					ref={csvLinkRef}
				>
					Download as CSV
				</CSVLink>
			</CSVLinkWrapper>
		</Box>
	);
};
