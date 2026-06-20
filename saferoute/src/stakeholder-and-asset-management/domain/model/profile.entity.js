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
   #_role;
   #_license;
   #_status;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - Profile identifier.
    * @param {string} [params.firstName=''] - First name.
    * @param {string} [params.lastName=''] - Last name.
    * @param {string} [params.phone=''] - Phone number.
    */
   constructor({ id = null, firstName = '', lastName = '', phone = '', role = '', license = '', status = ''}) {
       this.#_id = id;
       this.#_firstName = firstName;
       this.#_lastName = lastName;
       this.#_phone = phone;
       this.#_role = role;
       this.#_license = license;
       this.#_status = status;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get firstName() { return this.#_firstName; }
   set firstName(value) { this.#_firstName = value; }

   get lastName() { return this.#_lastName; }
   set lastName(value) { this.#_lastName = value; }

   get phone() { return this.#_phone; }
   set phone(value) { this.#_phone = value; }

   get role() { return this.#_role; }
   set role(value) { this.#_role = value; }

   get license() { return this.#_license; }
   set license(value) { this.#_license = value; }

   get status() { return this.#_status; }
   set status(value) { this.#_status = value; }
}
