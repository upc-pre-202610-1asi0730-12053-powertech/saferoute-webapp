/**
* Base class for all entities in the domain.
* Contains the unique identifier.
 */
export class BaseEntity {
  constructor(id = null) {
    this.id = id;
  }
}
