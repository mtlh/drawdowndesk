export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateField<T>(value: T, rules: ValidationRule<T>[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  rules: Partial<Record<keyof T, ValidationRule<unknown>[]>>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    if (fieldRules) {
      const value = data[field];
      const error = validateField(value, fieldRules as ValidationRule<unknown>[]);
      if (error) {
        errors[field] = error;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export const commonRules = {
  required: (message = "This field is required"): ValidationRule<unknown> => ({
    validate: (value) => value !== null && value !== undefined && value !== "",
    message,
  }),
  
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => typeof value === "string" && value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),
  
  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => typeof value === "string" && value.length <= max,
    message: message || `Must be no more than ${max} characters`,
  }),
  
  positiveNumber: (message = "Must be a positive number"): ValidationRule<number> => ({
    validate: (value) => typeof value === "number" && value > 0,
    message,
  }),
  
  nonNegativeNumber: (message = "Must be 0 or greater"): ValidationRule<number> => ({
    validate: (value) => typeof value === "number" && value >= 0,
    message,
  }),
  
  maxValue: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => typeof value === "number" && value <= max,
    message: message || `Must be ${max} or less`,
  }),
  
  futureDate: (message = "Date must be in the future"): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false;
      return new Date(value) > new Date();
    },
    message,
  }),
  
  pastDate: (message = "Date must be in the past"): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false;
      return new Date(value) <= new Date();
    },
    message,
  }),
  
  portfolioName: (message = "Portfolio name is required"): ValidationRule<string> => ({
    validate: (value) => typeof value === "string" && value.trim().length > 0,
    message,
  }),
  
  currency: (message = "Must be a valid amount"): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    },
    message,
  }),
};
