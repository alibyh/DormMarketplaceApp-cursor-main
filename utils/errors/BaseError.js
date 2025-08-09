export class BaseError extends Error {
  constructor(type, message, code = 'UNKNOWN', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}