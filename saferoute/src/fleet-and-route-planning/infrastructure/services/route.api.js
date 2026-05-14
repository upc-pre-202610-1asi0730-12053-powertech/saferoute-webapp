import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';


export class RouteApi extends BaseEndpoint {
  constructor() {
    super('/routes');
  }
}
