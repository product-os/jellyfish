import React from "react";
import { Txt, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";

export const NameWidget = widgetFactory("Name", {}, [JsonTypes.string])(
	({ value }) => {
		return <Txt>{value || "click to view"}</Txt>;
	}
);
