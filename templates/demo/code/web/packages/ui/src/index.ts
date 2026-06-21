// Public surface of the shared component library. Apps import only from here.
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
export { Table } from "./Table";
export type { TableProps } from "./Table";

// Small presentational helpers used across apps. (Implementations elided in the
// sample — they wrap a <span> with the right token-driven class.)
export { Money, StatusBadge, RoleBadge } from "./badges";
