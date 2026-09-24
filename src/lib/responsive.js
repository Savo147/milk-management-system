/**
 * How the admin screens change shape on a phone.
 *
 * These tables carry five to seven columns, which needs about 700–800px. At
 * 360px there is no honest way to show that as a table: dragging it sideways
 * loses the customer's name off the left edge just as you reach the amount,
 * and narrowing the columns wraps names onto two lines.
 *
 * So the table is hidden below `md` and the same rows are drawn as cards
 * instead — see DataCards. Both read the same data and call the same actions,
 * so there is one behaviour and two shapes, not two implementations.
 */

/** The table: wide screens only. */
export const tableOnly = { display: { xs: "none", md: "block" } };

/**
 * The card list: narrow screens only. `block`, not `flex` — it goes on
 * DataCards' own wrapper, which holds either a stack of cards or a single
 * empty-state panel, and the panel centres its text properly in flow.
 */
export const cardsOnly = { display: { xs: "block", md: "none" } };
