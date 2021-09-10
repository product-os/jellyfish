import React from "react";
import { Link, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";

export const LinkWidget = widgetFactory("Link", {}, [JsonTypes.string])(
	({ value }) => {
		return (
			// TODO: Find a better way to have a clickable link inside a button/a
			// This works but it is not valid HTML
			<Link
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					window.open(value, "_blank");
				}}
			>
				{value}
			</Link>
		);
	}
);
