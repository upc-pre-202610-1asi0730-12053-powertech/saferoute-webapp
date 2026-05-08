/**
* Message entity within the Notification bounded context.
*
* @class Message
*/
export class Message {
   #_id;
   #_title;
   #_content;
   #_timestamp;

   /**
    * @param {Object} params - Entity attributes.
    * @param {?number} [params.id=null] - Message identifier.
    * @param {string} [params.title=''] - Message title.
    * @param {string} [params.content=''] - Message content.
    * @param {string} [params.timestamp=''] - Timestamp.
    */
   constructor({ id = null, title = '', content = '', timestamp = ''}) {
       this.#_id = id;
       this.#_title = title;
       this.#_content = content;
       this.#_timestamp = timestamp;
   }

   get id() { return this.#_id; }
   set id(value) { this.#_id = value; }

   get title() { return this.#_title; }
   set title(value) { this.#_title = value; }

   get content() { return this.#_content; }
   set content(value) { this.#_content = value; }

   get timestamp() { return this.#_timestamp; }
   set timestamp(value) { this.#_timestamp = value; }
}
