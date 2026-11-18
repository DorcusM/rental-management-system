/**
 * Rent Calculator Utility
 * 
 * Computes rental balance for a tenant based on:
 * - Room monthly rental amount
 * - Tenant move-in date (and optional vacated date)
 * - Total payments recorded in the database
 */

function calculateTenantBalance(tenant, payments = [], asOfDate = new Date()) {
  if (!tenant) {
    return {
      monthsBilled: 0,
      monthlyRent: 0,
      totalDue: 0,
      totalPaid: 0,
      balance: 0,
      status: 'Paid',
      advanceAmount: 0,
      outstandingAmount: 0
    };
  }

  // Monthly rent from populated room or room object
  const monthlyRent = (tenant.roomId && typeof tenant.roomId === 'object')
    ? (tenant.roomId.monthlyRent || 0)
    : (tenant.monthlyRent || 0);

  const startDate = new Date(tenant.moveInDate || Date.now());
  const endDate = (!tenant.active && tenant.vacatedDate)
    ? new Date(tenant.vacatedDate)
    : new Date(asOfDate);

  // Calculate elapsed calendar billing months (inclusive of move-in month)
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth(); // 0-indexed
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  let monthsBilled = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  if (monthsBilled < 1) {
    monthsBilled = 1;
  }

  // Calculate total due
  const totalDue = monthsBilled * monthlyRent;

  // Calculate total paid from payment list or precalculated totalPaid
  let totalPaid = 0;
  if (Array.isArray(payments)) {
    totalPaid = payments.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);
  } else if (typeof payments === 'number') {
    totalPaid = payments;
  }

  // Balance: Positive means tenant owes money, Negative or zero means paid / advance
  const balance = totalDue - totalPaid;
  const isPaid = balance <= 0;

  return {
    monthsBilled,
    monthlyRent,
    totalDue,
    totalPaid,
    balance: Math.round(balance * 100) / 100,
    status: isPaid ? 'Paid' : 'Outstanding',
    outstandingAmount: balance > 0 ? Math.round(balance * 100) / 100 : 0,
    advanceAmount: balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0
  };
}

module.exports = {
  calculateTenantBalance
};
