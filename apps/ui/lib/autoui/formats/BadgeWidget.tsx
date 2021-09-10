import React from "react";
import { Badge, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";

export const BadgeWidget = widgetFactory("Badge", {}, [JsonTypes.string])(
	({ value }) => {
		return <Badge>{value}</Badge>;
	}
);
