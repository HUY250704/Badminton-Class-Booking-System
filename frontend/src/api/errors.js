export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong') {
  if (!error?.response) {
    if (error?.message) return error.message
    return 'Cannot connect to backend. Please make sure the API server is running.'
  }

  if (error.response.status === 401) {
    return 'Your session has expired. Please log in again.'
  }

  if (error.response.status === 403) {
    return 'You do not have permission to perform this action.'
  }

  return error.response.data?.message || fallbackMessage
}
