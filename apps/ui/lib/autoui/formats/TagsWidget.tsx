import React from "react";
import { Badge, widgetFactory } from "rendition";
import { JsonTypes } from "rendition/dist/components/Renderer/types";

export const TagsWidget = widgetFactory("Tags", {}, [JsonTypes.array])(
	({ value }) => {
		return (
			<>
				{value.map((t, index) => (
					<Badge key={index} m={1}>
						{t as string}
					</Badge>
				))}
			</>
		);
	}
);
