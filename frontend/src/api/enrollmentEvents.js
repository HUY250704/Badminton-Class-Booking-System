export const ENROLLMENT_EVENT_KEY = 'badminton:enrollment-event'

export function broadcastEnrollmentChange(classId) {
  const payload = {
    classId,
    timestamp: Date.now()
  }

  try {
    localStorage.setItem(ENROLLMENT_EVENT_KEY, JSON.stringify(payload))
  } catch {
    // Storage can be unavailable in private modes; same-tab invalidation still runs.
  }

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(ENROLLMENT_EVENT_KEY)
    channel.postMessage(payload)
    channel.close()
  }
}

export function invalidateEnrollmentQueries(queryClient, classId) {
  queryClient.invalidateQueries({ queryKey: ['classes'], exact: false, refetchType: 'all' })
  if (classId) {
    queryClient.invalidateQueries({ queryKey: ['class', classId] })
  }
  queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
}
