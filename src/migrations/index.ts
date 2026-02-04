import * as migration_20241125_222020_initial from './20241125_222020_initial';
import * as migration_20241214_124128 from './20241214_124128';
import * as migration_20260115_add_request_status from './20260115_add_request_status';
import * as migration_20260115_add_workflow_fields from './20260115_add_workflow_fields';
import * as migration_20260203_add_scheduling_and_qb_fields from './20260203_add_scheduling_and_qb_fields';

export const migrations = [
  {
    up: migration_20241125_222020_initial.up,
    down: migration_20241125_222020_initial.down,
    name: '20241125_222020_initial',
  },
  {
    up: migration_20241214_124128.up,
    down: migration_20241214_124128.down,
    name: '20241214_124128',
  },
  {
    up: migration_20260115_add_request_status.up,
    down: migration_20260115_add_request_status.down,
    name: '20260115_add_request_status',
  },
  {
    up: migration_20260115_add_workflow_fields.up,
    down: migration_20260115_add_workflow_fields.down,
    name: '20260115_add_workflow_fields',
  },
  {
    up: migration_20260203_add_scheduling_and_qb_fields.up,
    down: migration_20260203_add_scheduling_and_qb_fields.down,
    name: '20260203_add_scheduling_and_qb_fields',
  },
];
