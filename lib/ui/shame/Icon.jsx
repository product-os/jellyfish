
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import React from 'react'
export default function Icon (props) {
	return <i {...props} className={`fa${props.brands ? 'b' : 's'} fa-${props.name}`}/>
}
