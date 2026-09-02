import * as migration_20260730_185012_baseline_current_schema from './20260730_185012_baseline_current_schema';
import * as migration_20260809_162701_sitesettings_initial_schema from './20260809_162701_sitesettings_initial_schema';
import * as migration_20260813_150153_search_infrastructure from './20260813_150153_search_infrastructure';
import * as migration_20260817_182526_autori_collection_schema from './20260817_182526_autori_collection_schema';
import * as migration_20260819_102350_articole_autori_relations from './20260819_102350_articole_autori_relations';
import * as migration_20260823_181759_articles_editorial_status_workflow from './20260823_181759_articles_editorial_status_workflow';
import * as migration_20260825_060427_article_scheduling from './20260825_060427_article_scheduling';
import * as migration_20260829_122921_audit007_newsletter_confirmation_cooldown from './20260829_122921_audit007_newsletter_confirmation_cooldown';
import * as migration_20260901_100156_reg001b1_author_profile_type from './20260901_100156_reg001b1_author_profile_type';
import * as migration_20260901_111927_reg001b2_author_media from './20260901_111927_reg001b2_author_media';
import * as migration_20260901_141009_reg001c4_significant_update_date from './20260901_141009_reg001c4_significant_update_date';
import * as migration_20260902_105310 from './20260902_105310';

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
    name: '20260823_181759_articles_editorial_status_workflow',
  },
  {
    up: migration_20260825_060427_article_scheduling.up,
    down: migration_20260825_060427_article_scheduling.down,
    name: '20260825_060427_article_scheduling',
  },
  {
    up: migration_20260829_122921_audit007_newsletter_confirmation_cooldown.up,
    down: migration_20260829_122921_audit007_newsletter_confirmation_cooldown.down,
    name: '20260829_122921_audit007_newsletter_confirmation_cooldown',
  },
  {
    up: migration_20260901_100156_reg001b1_author_profile_type.up,
    down: migration_20260901_100156_reg001b1_author_profile_type.down,
    name: '20260901_100156_reg001b1_author_profile_type',
  },
  {
    up: migration_20260901_111927_reg001b2_author_media.up,
    down: migration_20260901_111927_reg001b2_author_media.down,
    name: '20260901_111927_reg001b2_author_media',
  },
  {
    up: migration_20260901_141009_reg001c4_significant_update_date.up,
    down: migration_20260901_141009_reg001c4_significant_update_date.down,
    name: '20260901_141009_reg001c4_significant_update_date',
  },
  {
    up: migration_20260902_105310.up,
    down: migration_20260902_105310.down,
    name: '20260902_105310'
  },
];
