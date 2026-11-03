function planLotConsumption(lots, quantity) {
  const requested = Number(quantity);
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new TypeError('A quantidade deve ser maior que zero.');
  }
  const ordered = [...lots].sort((a, b) => {
    const expiry = String(a.expiry_date || '').localeCompare(String(b.expiry_date || ''));
    return expiry || Number(a.id) - Number(b.id);
  });
  const available = ordered.reduce((sum, lot) => sum + Math.max(0, Number(lot.quantity_remaining) || 0), 0);
  if (available + 1e-9 < requested) return { ok: false, available, allocations: [] };
  let remaining = requested;
  const allocations = [];
  for (const lot of ordered) {
    if (remaining <= 1e-9) break;
    const balance = Math.max(0, Number(lot.quantity_remaining) || 0);
    const take = Math.min(balance, remaining);
    if (take > 0) allocations.push({ id: Number(lot.id), quantity: take });
    remaining -= take;
  }
  return { ok: remaining <= 1e-9, available, allocations };
}

module.exports = { planLotConsumption };
