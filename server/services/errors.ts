export class NotificationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotificationError';
  }

  static fromTwilioError(error: any): NotificationError {
    return new NotificationError(
      error.message,
      error.code?.toString(),
      error.status,
      { twilioError: error }
    );
  }
}

export class DeliveryError extends NotificationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DELIVERY_ERROR', 400, details);
    this.name = 'DeliveryError';
  }
}

export class ConfigurationError extends NotificationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends NotificationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}
