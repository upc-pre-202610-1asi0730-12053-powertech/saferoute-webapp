/**
 * IAM HTTP interceptor.
 * Attaches the bearer token (if present in localStorage) to every outgoing request.
 *
 * Wire it up from `shared/infrastructure/base-api.js`:
 *   this.#http.interceptors.request.use(iamInterceptor);
 *
 * @param {import('axios').InternalAxiosRequestConfig} config - Axios request config.
 * @returns {import('axios').InternalAxiosRequestConfig} Updated config.
 */
export function iamInterceptor(config) {
    const token = localStorage.getItem('saferoute.token');
    if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}
