import * as migration_20260730_185012_baseline_current_schema from './20260730_185012_baseline_current_schema';
import * as migration_20260809_162701_sitesettings_initial_schema from './20260809_162701_sitesettings_initial_schema';
import * as migration_20260813_150153_search_infrastructure from './20260813_150153_search_infrastructure';
import * as migration_20260817_182526_autori_collection_schema from './20260817_182526_autori_collection_schema';
import * as migration_20260819_102350_articole_autori_relations from './20260819_102350_articole_autori_relations';
import * as migration_20260823_181759_articles_editorial_status_workflow from './20260823_181759_articles_editorial_status_workflow';

export const migrations = [
  {
    up: migration_20260730_185012_baseline_current_schema.up,
    down: migration_20260730_185012_baseline_current_schema.down,
    name: '20260730_185012_baseline_current_schema',
  },
  {
    up: migration_20260809_162701_sitesettings_initial_schema.up,
    down: migration_20260809_162701_sitesettings_initial_schema.down,
    name: '20260809_162701_sitesettings_initial_schema',
  },
  {
    up: migration_20260813_150153_search_infrastructure.up,
    down: migration_20260813_150153_search_infrastructure.down,
    name: '20260813_150153_search_infrastructure',
  },
  {
    up: migration_20260817_182526_autori_collection_schema.up,
    down: migration_20260817_182526_autori_collection_schema.down,
    name: '20260817_182526_autori_collection_schema',
  },
  {
    up: migration_20260819_102350_articole_autori_relations.up,
    down: migration_20260819_102350_articole_autori_relations.down,
    name: '20260819_102350_articole_autori_relations',
  },
  {
    up: migration_20260823_181759_articles_editorial_status_workflow.up,
    down: migration_20260823_181759_articles_editorial_status_workflow.down,
    name: '20260823_181759_articles_editorial_status_workflow'
  },
];
