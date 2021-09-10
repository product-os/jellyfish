import { helpers } from "@balena/jellyfish-ui-components";
import React from "react";
import { Link, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";

export const AccountWidget = widgetFactory("Account", {}, [JsonTypes.object])<
	object,
	{},
	any
>(({ value }) => {
	return (
		// TODO: Find a better way to have a clickable link inside a button/a
		// This works but it is not valid HTML
		value ? (
			<Link
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					// helpers.appendToChannelPath(channel, value) // TODO: get channel somehow
				}}
			>
				{value.name}
			</Link>
		) : null
	);
});
