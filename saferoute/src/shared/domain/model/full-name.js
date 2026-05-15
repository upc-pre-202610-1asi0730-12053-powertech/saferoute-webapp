/**
 * Shared domain model class representing a full name with first and last name.
 * @class FullName
 */
export class FullName {
    /**
     * @param {string} firstName - First name.
     * @param {string} lastName - Last name.
     */
    constructor(firstName = '', lastName = '') {
        this.firstName = firstName;
        this.lastName = lastName;
    }

    /**
     * Returns the concatenated full name.
     * @returns {string}
     */
    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }
}
