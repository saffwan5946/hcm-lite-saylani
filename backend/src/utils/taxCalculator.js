/**
 * Calculates annual income tax based on the hackathon brief slabs:
 * - 0 to 600,000: 0%
 * - 600,001 to 1,200,000: 5% of excess over 600,000
 * - 1,200,001 to 2,400,000: 30,000 + 15% of excess over 1,200,000
 * - 2,400,001 to 3,600,000: 210,000 + 25% of excess over 2,400,000
 * - > 3,600,000: 510,000 + 35% of excess over 3,600,000
 * 
 * @param {number} annualGross 
 * @returns {number} annualTax
 */
function calculateAnnualTax(annualGross) {
  if (!annualGross || annualGross <= 600000) {
    return 0;
  }

  if (annualGross <= 1200000) {
    return Math.round((annualGross - 600000) * 0.05);
  }

  if (annualGross <= 2400000) {
    return Math.round(30000 + (annualGross - 1200000) * 0.15);
  }

  if (annualGross <= 3600000) {
    return Math.round(210000 + (annualGross - 2400000) * 0.25);
  }

  return Math.round(510000 + (annualGross - 3600000) * 0.35);
}

/**
 * Calculates monthly tax for a given monthly gross
 * @param {number} monthlyGross 
 * @returns {number} monthlyTax
 */
function calculateMonthlyTax(monthlyGross) {
  const annualGross = (Number(monthlyGross) || 0) * 12;
  const annualTax = calculateAnnualTax(annualGross);
  return Math.round(annualTax / 12);
}

module.exports = { calculateAnnualTax, calculateMonthlyTax };

