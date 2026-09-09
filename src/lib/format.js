const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatAmount(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return rupees.format(Number(value));
}

export function formatLiters(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  // 2.5 L, not 2.50 L — quantities always land on 0.5 steps.
  return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
