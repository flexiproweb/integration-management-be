class AppError extends Error {
  constructor(error, status = 400) {
    super(error);
    this.success = false;
    this.error = error;
    this.status = status;
  }
}

module.exports = AppError;