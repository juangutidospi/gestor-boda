import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
input[type="search"] { width: 100%; }
input[type="search"]::-webkit-search-cancel-button { filter: grayscale(1) opacity(.6); }
`;
