import React from 'react'

export const streamContext = React.createContext()

export const StreamProvider = ({
	stream, ...rest
}) => {
	return (
		<streamContext.Provider value={stream} {...rest}></streamContext.Provider>
	)
}
