export class QuotaLimitError extends Error {
  public code: number;

  constructor() {
    super('Google API Quota Reached. Cool down for 60 seconds.');
    this.code = 429;
    this.name = 'QuotaLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
