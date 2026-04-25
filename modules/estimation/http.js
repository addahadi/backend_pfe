// Re-export from the shared utils so any code still importing from './http.js'
// continues to work without change.
export { ok, notFound, handleError } from '../../utils/http.js';
