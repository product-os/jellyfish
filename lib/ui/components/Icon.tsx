import * as React from 'react';

export default ({ name, ...props }: any) => <i {...props} className={`fas fa-${name}`} />;
