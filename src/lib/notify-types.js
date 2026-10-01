/**
 * The kinds of notification the bell carries.
 *
 * The table can hold others; these are the two worth interrupting somebody
 * about. A stock note or a billing reminder is something you look up, not
 * something that should make a badge appear.
 *
 * Its own file, with no imports, because both the server actions and the
 * read-side queries need it and neither should have to pull the other in.
 */
export const NOTIFY_TYPES = ["problem", "rate"];
