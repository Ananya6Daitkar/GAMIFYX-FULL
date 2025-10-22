/**
 * Date utility functions for consistent date formatting across the application
 */

/**
 * Safely formats a date string to a localized date string
 * @param dateString - The date string to format
 * @returns Formatted date string or 'Invalid date' if parsing fails
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  try {
    // Handle null, undefined, or empty values
    if (!dateString) {
      return 'No date';
    }
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a date string to a relative time format (e.g., "2 days ago", "Yesterday")
 * @param dateString - The date string to format
 * @returns Relative time string or 'Invalid date' if parsing fails
 */
export const formatRelativeDate = (dateString: string | Date | null | undefined): string => {
  try {
    // Handle null, undefined, or empty values
    if (!dateString) {
      return 'No date';
    }
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return 'Invalid date';
  }
};

/**
 * Safely formats a date string for chart tick labels
 * @param value - The date value from chart data
 * @returns Formatted date string or 'Invalid' if parsing fails
 */
export const formatChartDate = (value: any): string => {
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? 'Invalid' : date.toLocaleDateString();
  } catch {
    return 'Invalid';
  }
};

/**
 * Formats a date string to include both date and time
 * @param dateString - The date string to format
 * @returns Formatted date and time string or 'Invalid date' if parsing fails
 */
export const formatDateTime = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid date';
  }
};
/
**
 * Sanitizes submission data to ensure consistent property names and valid dates
 * @param submission - The submission object to sanitize
 * @returns Sanitized submission object
 */
export const sanitizeSubmissionData = (submission: any): any => {
  if (!submission) return submission;
  
  // Ensure submittedAt property exists and is valid
  let submittedAt = submission.submittedAt || submission.timestamp || submission.created_at || submission.createdAt;
  
  // If no valid date property found, use current date
  if (!submittedAt) {
    submittedAt = new Date().toISOString();
  }
  
  // Ensure it's a valid date string
  try {
    const date = new Date(submittedAt);
    if (isNaN(date.getTime())) {
      submittedAt = new Date().toISOString();
    }
  } catch {
    submittedAt = new Date().toISOString();
  }
  
  return {
    ...submission,
    submittedAt,
    // Remove any conflicting timestamp properties
    timestamp: undefined,
    created_at: undefined,
    createdAt: undefined
  };
};

/**
 * Sanitizes an array of submission data
 * @param submissions - Array of submission objects to sanitize
 * @returns Array of sanitized submission objects
 */
export const sanitizeSubmissionsData = (submissions: any[]): any[] => {
  if (!Array.isArray(submissions)) return [];
  return submissions.map(sanitizeSubmissionData);
};