/**
* Plan entity within the Subscription bounded context.
*
* @class Plan
*/
export class Plan {
   #_id;
   #_name;
   #_price;
   #_benefits;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - Plan identifier.
    * @param {string} [params.name=''] - Plan name.
    * @param {number} [params.price=0] - Plan price.
    * @param {string} [params.benefits=''] - Plan benefits.
    */
   constructor({ id = null, name = '', price = 0, benefits = ''}) {
       this.#_id = id;
       this.#_name = name;
       this.#_price = price;
       this.#_benefits = benefits;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get name() { return this.#_name; }
   set name(value) { this.#_name = value; }

   get price() { return this.#_price; }
   set price(value) { this.#_price = value; }

   get benefits() { return this.#_benefits; }
   set benefits(value) { this.#_benefits = value; }
}
