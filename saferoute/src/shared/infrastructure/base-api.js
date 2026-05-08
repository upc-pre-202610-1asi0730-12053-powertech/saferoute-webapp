import axios from "axios";

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
    * Initializes the Axios HTTP client with the base URL from environment variables
    */
   constructor() {
       this.#http = axios.create({
           baseURL: platformApi,
           headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*'
           },
       });
   }

   /**
    * Returns the configured Axios HTTP client.
    * @returns {import('axios').AxiosInstance}
    */
   get http() {
       return this.#http;
   }
}
