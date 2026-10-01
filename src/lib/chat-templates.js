/**
 * The five things a dairy customer asks, and the reply to each.
 *
 * In Gujarati, written in English letters — the way the dairy and its
 * customers actually write to each other. These go out as they are, to people
 * reading them on a phone, so an English reply would have to be translated in
 * the reader's head before it meant anything. The rest of the app stays in
 * English because it is read by the dairy; these are read by the customer.
 *
 * Not a list of everything that could be said — a list of what actually gets
 * typed. A customer writes to their dairy for one of five reasons: the milk
 * did not come, there was less of it than usual, what do I owe, why has the
 * rate changed, and stop it for a few days. Everything else is rare enough
 * that it is quicker to type than to find in a list.
 *
 * `{name}` is filled in with whoever the thread is with. Nothing else is
 * substituted: a template that quietly invents an amount or a date is worse
 * than one that leaves a blank for you to fill, because it will be sent
 * without being read. The three gaps below are deliberate.
 */
export const TEMPLATE_GROUPS = [
  {
    key: "not-received",
    label: "Dudh nathi avyu",
    items: [
      {
        title: "Dudh nathi avyu",
        body: "Mafi chahu chhu, {name}. Aje round modo thayo chhe. Tamaru dudh pahochadi daishu —",
      },
    ],
  },
  {
    key: "less-milk",
    label: "Dudh ochhu avyu",
    items: [
      {
        title: "Dudh ochhu avyu",
        body: "Ha, aje ochhu gayu chhe. E farak tamara agla bill mathi kapi laishu.",
      },
    ],
  },
  {
    key: "amount",
    label: "Ketla paisa baki chhe",
    items: [
      {
        title: "Ketla paisa baki chhe",
        body: "Tamara Billing page par divas-var vigat ane baki rakam chhe. Tya kai khotu lage to kaho.",
      },
    ],
  },
  {
    key: "rate",
    label: "Rate kem badlayo",
    items: [
      {
        title: "Rate kem badlayo",
        body: "Tamaro rate ni tarikh thi badlayo chhe —  . E pehla nu dudh juna rate par j bill thayelu chhe.",
      },
    ],
  },
  {
    key: "pause",
    label: "Thoda divas dudh band",
    items: [
      {
        title: "Thoda divas dudh band",
        body: "Nondhi lidhu. Ani tarikh thi dudh nahi ave —  . E divas no charge pan nahi lage, ane pachhi rojnu chalu thai jashe.",
      },
    ],
  },
];

/** How many templates there are in all, for the line under the list. */
export const TEMPLATE_COUNT = TEMPLATE_GROUPS.reduce(
  (n, g) => n + g.items.length,
  0,
);

/** Puts the customer's name in, where the template asks for it. */
export function fillTemplate(body, name) {
  return body.replace(/\{name\}/g, (name ?? "").trim() || "bhai");
}
