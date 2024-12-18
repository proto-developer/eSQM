export const calNextAuditDate = (lastAuditDate, auditFrequencyInMonths) => {
  // Parse the lastAuditDate as a JavaScript Date object
  const lastAudit = new Date(lastAuditDate);

  // Calculate the number of days to add (approx. 30 days per month)
  const daysToAdd = auditFrequencyInMonths * 30;

  // Add the calculated days to the lastAudit date
  const nextAudit = new Date(lastAudit);
  nextAudit.setDate(nextAudit.getDate() + daysToAdd);

  // Format the date as "YYYY-MM-DD" for consistency
  const formattedNextAuditDate = nextAudit.toISOString().split("T")[0];
  return formattedNextAuditDate;
};
