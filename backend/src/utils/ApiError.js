export class ApiError extends Error {
  constructor(statusCode, message, code = 'API_ERROR', fields) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}
