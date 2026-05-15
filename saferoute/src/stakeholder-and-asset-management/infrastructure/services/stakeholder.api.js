import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';


export class StakeholderApi extends BaseEndpoint {
  constructor() {
    super('/profiles');
  }
}
