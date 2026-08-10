import * as migration_20260730_185012_baseline_current_schema from './20260730_185012_baseline_current_schema';
import * as migration_20260809_162701_sitesettings_initial_schema from './20260809_162701_sitesettings_initial_schema';

export const migrations = [
  {
    up: migration_20260730_185012_baseline_current_schema.up,
    down: migration_20260730_185012_baseline_current_schema.down,
    name: '20260730_185012_baseline_current_schema',
  },
  {
    up: migration_20260809_162701_sitesettings_initial_schema.up,
    down: migration_20260809_162701_sitesettings_initial_schema.down,
    name: '20260809_162701_sitesettings_initial_schema'
  },
];
