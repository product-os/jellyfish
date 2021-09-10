import React from "react";
import { TextWithCopy, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";

export const UUIDWidget = widgetFactory("UUID", {}, [JsonTypes.string])(
	({ value }) => {
		return (
			<TextWithCopy
				monospace
				showCopyButton="always"
				tooltip={value}
				copy={value}
			>
				{value.slice(0, 7)}
			</TextWithCopy>
		);
	}
);
