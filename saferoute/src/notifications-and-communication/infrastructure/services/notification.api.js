import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';


export class NotificationApi extends BaseEndpoint {
  constructor() {
    super('/notifications');
  }

  
  async sendAlert(alertData) {
    return await this.create(alertData);
  }
}
