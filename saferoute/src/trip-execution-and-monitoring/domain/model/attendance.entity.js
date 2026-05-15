/**
 * Attendance class within the Trip bounded context.
 *
 * Defined in trip.domain.model (vue-saferoute-trip.puml).
 *
 * @class Attendance
 */
export class Attendance {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {?string} [params.tripId=null]
     * @param {?string} [params.childId=null]
     * @param {string} [params.boardingState='']
     * @param {string} [params.boardedAt='']
     */
    constructor({ id = null, tripId = null, childId = null, boardingState = '', boardedAt = '' }) {
        this.id = id;
        this.tripId = tripId;
        this.childId = childId;
        this.boardingState = boardingState;
        this.boardedAt = boardedAt;
    }
}
