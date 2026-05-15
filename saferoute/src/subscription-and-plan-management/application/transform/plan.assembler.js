import { BaseAssembler } from '../../../shared/application/transform/base.assembler';
import { Plan } from '../../domain/model/plan.entity';


export class PlanAssembler extends BaseAssembler {
  toEntity(dto) {
    return new Plan(dto.id, dto.name, dto.price, dto.benefits);
  }

  toDto(entity) {
    return {
      id: entity.id,
      name: entity.name,
      price: entity.price,
      benefits: entity.benefits
    };
  }
}
