import { handleError } from '../utils/http.js';

// Express 4-arg error handler — must keep the `next` param even if unused
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  handleError(res, err);
}

export default errorHandler;
