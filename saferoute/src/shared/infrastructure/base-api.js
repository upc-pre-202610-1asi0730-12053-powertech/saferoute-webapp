import axios from "axios";
import { iamInterceptor } from "../../identity-and-access-management/infrastructure/iam.interceptor.js";

const platformApi = import.meta.env.VITE_API_BASE_URL;

/**
* Shared infrastructure base class that configures the HTTP client.
*
* @class BaseApi
*/
export class BaseApi {
   /**
    * @private
    * Axios HTTP client instance
    * @type {import('axios').AxiosInstance}
    */
   #http;

   /**
    * Initializes the Axios HTTP client with the base URL from environment variables.
    * Wires the IAM interceptor so authenticated requests carry the bearer token.
    */
   constructor() {
       this.#http = axios.create({
           baseURL: platformApi,
           headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*'
           },
       });
       this.#http.interceptors.request.use(iamInterceptor);
   }

   /**
    * Returns the configured Axios HTTP client.
    * @returns {import('axios').AxiosInstance}
    */
   get http() {
       return this.#http;
   }
}

/**
 * Alias for BaseApi — matches the `ApiClient` name defined in the shared
 * infrastructure diagram (vue-saferoute-shared.puml).
 */
export { BaseApi as ApiClient };
