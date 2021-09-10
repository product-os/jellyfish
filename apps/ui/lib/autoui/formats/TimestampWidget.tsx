import React from "react";
import { Txt, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";
import format from "date-fns/format";
import parseISO from "date-fns/parseISO";

export const TimestampWidget = widgetFactory("Timestamp", {}, [
	JsonTypes.string,
])(({ value }) => {
	return (
		<Txt>{value ? format(parseISO(value), "MM/dd/yyyy hh:mm:ss") : ""}</Txt>
	);
});
