const errorHandler = (err, req, res, next) => {
    // console.error(err);

    res.status(err.statusCode || 500).json({
        error: err.message || err || "Internal server error"
    })
}

module.exports = errorHandler;