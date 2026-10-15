import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

// withCredentials sends the httpOnly JWT cookie on every request.
const client = axios.create({ baseURL: `${API_URL}/api`, withCredentials: true });

// Normalise every failure into `error.userMessage` (+ `error.details`) for the UI.
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error.response?.data;
    error.userMessage = data?.message
      ? data.details?.length
        ? `${data.message}: ${data.details.join('; ')}`
        : data.message
      : error.code === 'ERR_NETWORK'
        ? 'Cannot reach the server. Please try again.'
        : error.message || 'Something went wrong';
    return Promise.reject(error);
  }
);

export const errorMessage = (error) => error?.userMessage || error?.message || 'Something went wrong';

export default client;
