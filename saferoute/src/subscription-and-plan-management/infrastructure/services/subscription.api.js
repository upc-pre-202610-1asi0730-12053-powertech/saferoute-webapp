import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';


export class SubscriptionApi extends BaseEndpoint {
  constructor() {
    super('/subscriptions');
  }
}
