import React from 'react'
import {
    Button
} from 'rendition'
import Icon from '../../ui/shame/Icon'
import {
	ErrorMessage
} from './ErrorMessage'

export const TaskButton = ({ task, children, ...rest }) => {
    const icon = task.started && <Icon spin name="cog" />;

    return (
        <>
            {task.error && (
                <><ErrorMessage error={task.error} /><br/></>
            )}
            <Button
                disabled={task.started}
                icon={icon}
                {...rest}>
                {children}
            </Button>
        </>
    )
}
