/**
* Route entity within the Route bounded context.
*
* @class Route
*/
export class Route {
   #_id;
   #_name;
   #_origin;
   #_destination;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - Route identifier.
    * @param {string} [params.name=''] - Route name.
    * @param {string} [params.origin=''] - Route origin.
    * @param {string} [params.destination=''] - Route destination.
    */
   constructor({ id = null, name = '', origin = '', destination = ''}) {
       this.#_id = id;
       this.#_name = name;
       this.#_origin = origin;
       this.#_destination = destination;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get name() { return this.#_name; }
   set name(value) { this.#_name = value; }

   get origin() { return this.#_origin; }
   set origin(value) { this.#_origin = value; }

   get destination() { return this.#_destination; }
   set destination(value) { this.#_destination = value; }
}
