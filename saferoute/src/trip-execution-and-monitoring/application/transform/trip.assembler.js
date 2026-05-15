import { BaseAssembler } from '../../../shared/application/transform/base.assembler';
import { Trip } from '../../domain/model/trip.entity';


export class TripAssembler extends BaseAssembler {
  toEntity(dto) {
    return new Trip(dto.id, dto.routeId, dto.driverId, dto.status, dto.currentLocation);
  }

  toDto(entity) {
    return {
      id: entity.id,
      routeId: entity.routeId,
      driverId: entity.driverId,
      status: entity.status,
      currentLocation: entity.currentLocation
    };
  }
}
