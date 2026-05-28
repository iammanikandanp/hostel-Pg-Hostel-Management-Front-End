import axios from 'axios';

const hstApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = []; // pending requests waiting for a new token

const processQueue = (error) => {
  refreshQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
  refreshQueue = [];
};

hstApi.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    // Only intercept 401s that haven't already been retried and aren't the refresh call itself
    if (
      err.response?.status === 401 &&
      !original._retried &&
      !original.url?.endsWith('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => hstApi(original));
      }

      original._retried = true;
      isRefreshing = true;

      try {
        await hstApi.post('/auth/refresh');
        processQueue(null);
        return hstApi(original); // retry original request with new access cookie
      } catch (refreshErr) {
        processQueue(refreshErr);
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default hstApi;
