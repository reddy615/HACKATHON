export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));

export const formatPercent = (value) => `${Number(value || 0).toFixed(0)}%`;
