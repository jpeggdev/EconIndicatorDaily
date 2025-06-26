export function formatNumberToHighestClassification(value: number, unit?: string | null): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';

  // Handle percentages
  if (unit?.includes('%') || unit?.includes('Percent')) {
    return `${value.toFixed(1)}%`;
  }

  // Handle special cases for different units
  const isMonetary = unit?.includes('$') || unit?.includes('USD') || unit?.includes('Billion') || unit?.includes('Dollars');
  const isPeople = unit?.includes('People') || unit?.includes('Persons');
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) {
    // Trillions
    const formatted = (value / 1e12).toFixed(2);
    if (isMonetary) return `$${formatted}T`;
    if (isPeople) return `${formatted}T people`;
    return `${formatted}T`;
  } else if (absValue >= 1e9) {
    // Billions
    const formatted = (value / 1e9).toFixed(2);
    if (isMonetary) return `$${formatted}B`;
    if (isPeople) return `${formatted}B people`;
    return `${formatted}B`;
  } else if (absValue >= 1e6) {
    // Millions
    const formatted = (value / 1e6).toFixed(1);
    if (isMonetary) return `$${formatted}M`;
    if (isPeople) return `${formatted}M people`;
    return `${formatted}M`;
  } else if (absValue >= 1e3) {
    // Thousands
    const formatted = (value / 1e3).toFixed(1);
    if (isMonetary) return `$${formatted}K`;
    if (isPeople) return `${formatted}K people`;
    return `${formatted}K`;
  } else {
    // Less than thousands
    if (unit?.includes('Index') || unit?.includes('Rate') || unit?.includes('Percent')) {
      return value.toFixed(2);
    }
    if (isMonetary) return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  }
}

export function formatNumberWithUnit(value: number, unit?: string | null, short = false): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  const formatted = formatNumberToHighestClassification(value, unit);
  
  // For short format (chart axis), return just the formatted number
  if (short) {
    return formatted;
  }
  
  // If unit is not included in the formatted string and is meaningful, append it
  if (unit && !formatted.includes('$') && !formatted.includes('%') && !formatted.includes('people')) {
    // Clean up unit string
    const cleanUnit = unit
      .replace(/Billions of |Thousands of |Millions of /gi, '')
      .replace(/U\.S\. /gi, '')
      .trim();
    
    // Don't append if it's redundant
    if (!['USD', 'Dollars', 'Number', 'Percent', 'Index'].some(term => 
      cleanUnit.toLowerCase().includes(term.toLowerCase())
    )) {
      return `${formatted} ${cleanUnit}`;
    }
  }
  
  return formatted;
}