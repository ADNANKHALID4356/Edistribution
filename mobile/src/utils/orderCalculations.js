/**
 * Canonical order calculations for mobile app.
 * Mirrors backend convention: gross = qty × unit_price, net = gross − discount.
 */

const round2 = (value) => parseFloat((parseFloat(value) || 0).toFixed(2));

export function getLineGrossTotal(quantity, unitPrice) {
  return round2((parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0));
}

export function getLineDiscountAmount(grossTotal, discountPercentage = 0) {
  const pct = parseFloat(discountPercentage) || 0;
  return round2((grossTotal * pct) / 100);
}

export function getLineNetPrice(quantity, unitPrice, discountPercentage = 0, discountAmount = null) {
  const gross = getLineGrossTotal(quantity, unitPrice);
  const discount =
    discountAmount != null ? round2(discountAmount) : getLineDiscountAmount(gross, discountPercentage);
  return round2(gross - discount);
}

/**
 * Apply line discount fields on a cart item (mutates logical shape for SQLite).
 * total_price stored locally = net line total (after item discount).
 */
export function applyLineDiscount(item, discountPercentage) {
  const gross = getLineGrossTotal(item.quantity, item.unit_price);
  const pct = parseFloat(discountPercentage) || 0;
  const discountAmount = getLineDiscountAmount(gross, pct);
  const netPrice = round2(gross - discountAmount);

  return {
    ...item,
    discount_percentage: pct,
    discount_amount: discountAmount,
    total_price: netPrice,
  };
}

/**
 * Recalculate when quantity changes while preserving discount %.
 */
export function applyQuantityChange(item, newQuantity) {
  const pct = parseFloat(item.discount_percentage) || 0;
  return applyLineDiscount({ ...item, quantity: newQuantity }, pct);
}

/**
 * Order-level totals from cart items.
 * subtotal  = sum of net line totals (after item discounts, before order discount)
 * total_amount = subtotal − order-level discount
 */
export function calculateOrderTotals(items, orderDiscountAmount = 0) {
  let grossSubtotal = 0;
  let itemDiscountTotal = 0;
  let netSubtotal = 0;

  items.forEach((item) => {
    const gross = getLineGrossTotal(item.quantity, item.unit_price);
    const itemDiscount = round2(item.discount_amount || 0);
    grossSubtotal += gross;
    itemDiscountTotal += itemDiscount;
    netSubtotal += round2(gross - itemDiscount);
  });

  const orderDiscount = round2(orderDiscountAmount);
  const finalTotal = round2(netSubtotal - orderDiscount);

  return {
    subtotal: round2(netSubtotal),
    gross_subtotal: round2(grossSubtotal),
    item_discount_total: round2(itemDiscountTotal),
    discount_amount: orderDiscount,
    discount_percentage:
      grossSubtotal > 0 ? round2((orderDiscount / grossSubtotal) * 100) : 0,
    tax_amount: 0,
    total_amount: finalTotal,
  };
}

/**
 * Build API payload line item for sync (gross total_price + explicit net_price).
 */
export function toSyncLineItem(item) {
  const grossTotal = getLineGrossTotal(item.quantity, item.unit_price);
  const discountAmt = round2(item.discount_amount || 0);
  const netPrice = round2(grossTotal - discountAmt);
  const discountPct =
    grossTotal > 0 ? parseFloat(((discountAmt / grossTotal) * 100).toFixed(4)) : 0;

  return {
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: grossTotal,
    discount_amount: discountAmt,
    discount: discountAmt,
    discount_percentage: discountPct,
    net_price: netPrice,
  };
}
