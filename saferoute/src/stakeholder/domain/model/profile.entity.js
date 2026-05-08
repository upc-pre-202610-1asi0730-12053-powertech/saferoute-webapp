/**
* Profile entity within the Stakeholder bounded context.
*
* @class Profile
*/
export class Profile {
   #_id;
   #_firstName;
   #_lastName;
   #_phone;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - Profile identifier.
    * @param {string} [params.firstName=''] - First name.
    * @param {string} [params.lastName=''] - Last name.
    * @param {string} [params.phone=''] - Phone number.
    */
   constructor({ id = null, firstName = '', lastName = '', phone = ''}) {
       this.#_id = id;
       this.#_firstName = firstName;
       this.#_lastName = lastName;
       this.#_phone = phone;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get firstName() { return this.#_firstName; }
   set firstName(value) { this.#_firstName = value; }

   get lastName() { return this.#_lastName; }
   set lastName(value) { this.#_lastName = value; }

   get phone() { return this.#_phone; }
   set phone(value) { this.#_phone = value; }
}
