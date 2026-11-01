const ApiResponse = require('../utils/apiResponse');

/**
 * Zod validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return ApiResponse.badRequest(res, 'Validation failed', errors);
      }

      // Replace req data with parsed & validated data
      if (result.data.body) req.body = result.data.body;
      if (result.data.query) req.query = result.data.query;
      if (result.data.params) req.params = result.data.params;

      next();
    } catch (error) {
      return ApiResponse.error(res, 'Validation error occurred');
    }
  };
};

module.exports = { validate };
