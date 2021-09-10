import React from "react";
import { Badge, widgetFactory } from "rendition";
import styled from "styled-components";
import { JsonTypes } from "rendition/dist/components/Renderer/types";
import { formatDateLocal } from "@balena/jellyfish-ui-components";

const SingleLineSpan = styled.span`
	whitespace: "nowrap";
`;

export const DueDateWidget = widgetFactory("Due Date", {}, [JsonTypes.string])(
	({ value }) => {
		if (!value) {
			return <span />;
		}
		const date = Date.parse(value);
		const due = new Date(date).valueOf() <= new Date(Date.now()).valueOf();
		const formattedDate = formatDateLocal(date);

		return (
			<SingleLineSpan>
				<Badge data-test="due-date" shade={due ? 5 : 11}>
					{`${due ? "Due: " : ""}${formattedDate}`}
				</Badge>
			</SingleLineSpan>
		);
	}
);
