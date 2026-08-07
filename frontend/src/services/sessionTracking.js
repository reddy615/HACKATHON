import api from '../api/axios';

const SESSION_KEY = 'cartrescue_session_id';
const QUEUE_KEY = 'cartrescue_session_queue';

const getBrowserInfo = () => {
  const ua = navigator.userAgent || '';
  let browser = 'unknown';
  let deviceType = 'desktop';
  let os = navigator.platform || 'unknown';

  if (/Edg\//.test(ua)) browser = 'edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'chrome';
  else if (/Firefox\//.test(ua)) browser = 'firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'safari';
  else if (/OPR\//.test(ua)) browser = 'opera';

  if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) deviceType = 'mobile';
  else if (/Tablet/.test(ua)) deviceType = 'tablet';

  if (navigator.userAgentData?.platform) {
    os = navigator.userAgentData.platform;
  }

  return { deviceType, browser, os };
};

export const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
};

const queueEvent = (payload) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ ...payload, createdAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
  } catch (error) {
    console.warn('Failed to queue session event', error);
  }
};

const flushQueuedEvents = async () => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!queue.length) return;

    const pending = [...queue];
    localStorage.removeItem(QUEUE_KEY);

    for (const event of pending) {
      try {
        await api.post('/sessions/track', {
          sessionId: event.sessionId || getOrCreateSessionId(),
          ...getBrowserInfo(),
          userAgent: navigator.userAgent || '',
          ipAddress: '',
          ...event,
        });
      } catch (error) {
        queueEvent(event);
      }
    }
  } catch (error) {
    console.warn('Queue flush failed', error);
  }
};

export const trackSessionEvent = async (payload = {}) => {
  const sessionId = payload.sessionId || getOrCreateSessionId();
  const browserInfo = getBrowserInfo();
  const eventPayload = {
    sessionId,
    ...browserInfo,
    userAgent: navigator.userAgent || '',
    ipAddress: '',
    location: payload.location || {},
    ...payload,
  };

  try {
    const response = await api.post('/sessions/track', eventPayload);
    return response.data;
  } catch (error) {
    queueEvent(eventPayload);
    return null;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueuedEvents();
  });
}

export const flushSessionQueue = () => flushQueuedEvents();
