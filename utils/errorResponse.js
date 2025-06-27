const errorResponse = (status, message) => {
    const err = new Error(message);
    err.statusCode = status || 500;
    return err;
}

module.exports = errorResponse;