const ApiError = require('../utils/ApiError');

// validate(schema, 'body' | 'query' | 'params') -> replaces the request part with the
// sanitised value (unknown keys stripped, types coerced). Because values are coerced to
// strings/numbers/booleans, Mongo operator injection ({"$gt": ""}) is rejected here.
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ''));
      return next(new ApiError(400, 'Validation failed', details));
    }
    req[source] = value;
    return next();
  };

module.exports = validate;
