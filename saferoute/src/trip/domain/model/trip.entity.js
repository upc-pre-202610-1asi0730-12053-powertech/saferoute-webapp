/**
* Trip entity within the Trip bounded context.
*
* @class Trip
*/
export class Trip {
   #_id;
   #_routeId;
   #_driverId;
   #_status;
   #_currentLocation;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - Trip identifier.
    * @param {?number} [params.routeId=null] - Route ID.
    * @param {?number} [params.driverId=null] - Driver ID.
    * @param {string} [params.status=''] - Trip status.
    * @param {string} [params.currentLocation=''] - Current location.
    */
   constructor({ id = null, routeId = null, driverId = null, status = '', currentLocation = ''}) {
       this.#_id = id;
       this.#_routeId = routeId;
       this.#_driverId = driverId;
       this.#_status = status;
       this.#_currentLocation = currentLocation;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get routeId() { return this.#_routeId; }
   set routeId(value) { this.#_routeId = value; }

   get driverId() { return this.#_driverId; }
   set driverId(value) { this.#_driverId = value; }

   get status() { return this.#_status; }
   set status(value) { this.#_status = value; }

   get currentLocation() { return this.#_currentLocation; }
   set currentLocation(value) { this.#_currentLocation = value; }
}
