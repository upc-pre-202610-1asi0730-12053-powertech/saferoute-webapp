/**
* User entity within the IAM bounded context.
*
* @class User
*/
export class User {
   #_id;
   #_username;
   #_email;
   #_roles;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - User identifier.
    * @param {string} [params.username=''] - Username.
    * @param {string} [params.email=''] - Email.
    * @param {string} [params.roles=''] - Roles.
    */
   constructor({ id = null, username = '', email = '', roles = ''}) {
       this.#_id = id;
       this.#_username = username;
       this.#_email = email;
       this.#_roles = roles;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get username() { return this.#_username; }
   set username(value) { this.#_username = value; }

   get email() { return this.#_email; }
   set email(value) { this.#_email = value; }

   get roles() { return this.#_roles; }
   set roles(value) { this.#_roles = value; }
}
