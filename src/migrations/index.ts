import * as migration_20260730_185012_baseline_current_schema from './20260730_185012_baseline_current_schema';

export const migrations = [
  {
    up: migration_20260730_185012_baseline_current_schema.up,
    down: migration_20260730_185012_baseline_current_schema.down,
    name: '20260730_185012_baseline_current_schema'
  },
];
