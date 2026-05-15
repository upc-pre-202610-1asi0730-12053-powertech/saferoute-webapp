import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';


export class TripApi extends BaseEndpoint {
  constructor() {
    super('/trips');
  }

  
  async startTrip(tripData) {
    return await this.create(tripData);
  }
}
