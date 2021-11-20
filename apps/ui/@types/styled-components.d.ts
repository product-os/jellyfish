// See https://styled-components.com/docs/api#typescript

import 'styled-components';
import { Theme as RenditionTheme } from 'rendition/dist/theme';
import { ThemeType } from 'grommet';

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType, RenditionTheme {}
}
