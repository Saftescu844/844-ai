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
import * as migration_20260902_120037 from './20260902_120037';
import * as migration_20260909_074122_reg001d_flash_engine_runs from './20260909_074122_reg001d_flash_engine_runs';
import * as migration_20260910_090156_reg001d_flash_engine_job_slug from './20260910_090156_reg001d_flash_engine_job_slug';
import * as migration_20260919_111358_u14_7h_flash_ai_comments from './20260919_111358_u14_7h_flash_ai_comments';
import * as migration_20260925_120000_sec001_data_api_acl_hardening from './20260925_120000_sec001_data_api_acl_hardening';
import * as migration_20260927_152500_db001b_newsletter_rls_probe from './20260927_152500_db001b_newsletter_rls_probe';
import * as migration_20260927_162500_db001c_useri_sessions_rls from './20260927_162500_db001c_useri_sessions_rls';
import * as migration_20260927_164500_db001d_useri_rls from './20260927_164500_db001d_useri_rls';
import * as migration_20260927_170500_db001e_newsletter_segment_rls from './20260927_170500_db001e_newsletter_segment_rls';
import * as migration_20260927_172500_db001f_comentarii_rls from './20260927_172500_db001f_comentarii_rls';
import * as migration_20261003_210058_flash002_source_discovery from './20261003_210058_flash002_source_discovery';
import * as migration_20261007_134000_flash_rss_candidate_skip_memory from './20261007_134000_flash_rss_candidate_skip_memory';
import * as migration_20261009_200000_flash_editorial_subcategories from './20261009_200000_flash_editorial_subcategories';

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
    name: '20260902_105310',
  },
  {
    up: migration_20260902_120037.up,
    down: migration_20260902_120037.down,
    name: '20260902_120037',
  },
  {
    up: migration_20260909_074122_reg001d_flash_engine_runs.up,
    down: migration_20260909_074122_reg001d_flash_engine_runs.down,
    name: '20260909_074122_reg001d_flash_engine_runs',
  },
  {
    up: migration_20260910_090156_reg001d_flash_engine_job_slug.up,
    down: migration_20260910_090156_reg001d_flash_engine_job_slug.down,
    name: '20260910_090156_reg001d_flash_engine_job_slug',
  },
  {
    up: migration_20260919_111358_u14_7h_flash_ai_comments.up,
    down: migration_20260919_111358_u14_7h_flash_ai_comments.down,
    name: '20260919_111358_u14_7h_flash_ai_comments',
  },
  {
    up: migration_20260925_120000_sec001_data_api_acl_hardening.up,
    down: migration_20260925_120000_sec001_data_api_acl_hardening.down,
    name: '20260925_120000_sec001_data_api_acl_hardening',
  },
  {
    up: migration_20260927_152500_db001b_newsletter_rls_probe.up,
    down: migration_20260927_152500_db001b_newsletter_rls_probe.down,
    name: '20260927_152500_db001b_newsletter_rls_probe',
  },
  {
    up: migration_20260927_162500_db001c_useri_sessions_rls.up,
    down: migration_20260927_162500_db001c_useri_sessions_rls.down,
    name: '20260927_162500_db001c_useri_sessions_rls',
  },
  {
    up: migration_20260927_164500_db001d_useri_rls.up,
    down: migration_20260927_164500_db001d_useri_rls.down,
    name: '20260927_164500_db001d_useri_rls',
  },
  {
    up: migration_20260927_170500_db001e_newsletter_segment_rls.up,
    down: migration_20260927_170500_db001e_newsletter_segment_rls.down,
    name: '20260927_170500_db001e_newsletter_segment_rls',
  },
  {
    up: migration_20260927_172500_db001f_comentarii_rls.up,
    down: migration_20260927_172500_db001f_comentarii_rls.down,
    name: '20260927_172500_db001f_comentarii_rls',
  },
  {
    up: migration_20261003_210058_flash002_source_discovery.up,
    down: migration_20261003_210058_flash002_source_discovery.down,
    name: '20261003_210058_flash002_source_discovery'
  },
  {
    up: migration_20261007_134000_flash_rss_candidate_skip_memory.up,
    down: migration_20261007_134000_flash_rss_candidate_skip_memory.down,
    name: '20261007_134000_flash_rss_candidate_skip_memory'
  },
  {
    up: migration_20261009_200000_flash_editorial_subcategories.up,
    down: migration_20261009_200000_flash_editorial_subcategories.down,
    name: '20261009_200000_flash_editorial_subcategories'
  },
];
