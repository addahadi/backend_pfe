-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_usage_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  usage_type USER-DEFINED NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  subscription_id uuid,
  CONSTRAINT ai_usage_history_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_ai_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id)
);
CREATE TABLE public.article_tags (
  article_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT article_tags_pkey PRIMARY KEY (article_id, tag_id),
  CONSTRAINT article_tags_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(article_id),
  CONSTRAINT article_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(tag_id)
);
CREATE TABLE public.article_types (
  article_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT article_types_pkey PRIMARY KEY (article_type_id)
);
CREATE TABLE public.articles (
  article_id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_type_id uuid,
  title_en character varying NOT NULL,
  title_ar character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  excerpt_en text,
  excerpt_ar text,
  content_en jsonb,
  content_ar jsonb,
  cover_img character varying,
  status USER-DEFINED DEFAULT 'DRAFT'::article_status,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT articles_pkey PRIMARY KEY (article_id),
  CONSTRAINT articles_article_type_id_fkey FOREIGN KEY (article_type_id) REFERENCES public.article_types(article_type_id)
);
CREATE TABLE public.categories (
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying NOT NULL UNIQUE,
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  description_en text,
  description_ar text,
  icon character varying,
  is_active boolean DEFAULT true,
  parent_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  category_level USER-DEFINED DEFAULT 'ROOT'::category_level,
  CONSTRAINT categories_pkey PRIMARY KEY (category_id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.coefficients (
  coefficient_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  unit_id uuid,
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  value double precision NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  config_group_id uuid,
  CONSTRAINT coefficients_pkey PRIMARY KEY (coefficient_id),
  CONSTRAINT coefficients_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
  CONSTRAINT coefficients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(unit_id),
  CONSTRAINT coefficients_config_group_id_fkey FOREIGN KEY (config_group_id) REFERENCES public.material_config(config_id)
);
CREATE TABLE public.estimation (
  estimation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  budget_type text NOT NULL,
  total_budget double precision NOT NULL DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  subscription_id uuid,
  CONSTRAINT estimation_pkey PRIMARY KEY (estimation_id),
  CONSTRAINT estimation_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT estimation_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id)
);
CREATE TABLE public.estimation_detail_material (
  detail_id uuid NOT NULL DEFAULT gen_random_uuid(),
  material_id uuid,
  estimation_id uuid,
  quantity double precision NOT NULL DEFAULT 0.0,
  applied_waste double precision DEFAULT 0.0,
  exchange_rate_snapshot double precision,
  waste_factor_snapshot double precision,
  sub_total double precision NOT NULL DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  project_details_id uuid,
  quantity_with_waste double precision,
  unit_price_snapshot double precision,
  CONSTRAINT estimation_detail_material_pkey PRIMARY KEY (detail_id),
  CONSTRAINT estimation_detail_material_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.resource_catalog(material_id),
  CONSTRAINT estimation_detail_material_estimation_id_fkey FOREIGN KEY (estimation_id) REFERENCES public.estimation(estimation_id),
  CONSTRAINT estimation_detail_material_details_id_fkey FOREIGN KEY (project_details_id) REFERENCES public.project_details(id)
);
CREATE TABLE public.estimation_detail_service (
  detail_id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid,
  estimation_id uuid,
  unit_id uuid,
  quantity double precision NOT NULL DEFAULT 0.0,
  sub_total double precision NOT NULL DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT estimation_detail_service_pkey PRIMARY KEY (detail_id),
  CONSTRAINT estimation_detail_service_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_config(service_id),
  CONSTRAINT estimation_detail_service_estimation_id_fkey FOREIGN KEY (estimation_id) REFERENCES public.estimation(estimation_id),
  CONSTRAINT estimation_detail_service_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(unit_id)
);
CREATE TABLE public.exchange_rate_log (
  rate_id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_id uuid,
  official_rate double precision NOT NULL,
  final_applied_rate double precision NOT NULL,
  api_status boolean DEFAULT true,
  last_sync_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT exchange_rate_log_pkey PRIMARY KEY (rate_id),
  CONSTRAINT exchange_rate_log_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.financial_settings(config_id)
);
CREATE TABLE public.features (
  feature_id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid,
  feature_key character varying NOT NULL,
  feature_value_en character varying,
  feature_value_ar character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT features_pkey PRIMARY KEY (feature_id),
  CONSTRAINT features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id)
);
CREATE TABLE public.field_definitions (
  field_id uuid NOT NULL DEFAULT gen_random_uuid(),
  formula_id uuid,
  field_type_id uuid,
  unit_id uuid,
  label_en character varying NOT NULL,
  label_ar character varying NOT NULL,
  required boolean DEFAULT false,
  default_value character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  source_formula_id uuid,
  sort_order integer DEFAULT 0,
  variable_name character varying,
  CONSTRAINT field_definitions_pkey PRIMARY KEY (field_id),
  CONSTRAINT field_definitions_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES public.formulas(formula_id),
  CONSTRAINT field_definitions_field_type_id_fkey FOREIGN KEY (field_type_id) REFERENCES public.field_types(field_type_id),
  CONSTRAINT field_definitions_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(unit_id),
  CONSTRAINT field_definitions_source_formula_id_fkey FOREIGN KEY (source_formula_id) REFERENCES public.formulas(formula_id)
);
CREATE TABLE public.field_types (
  field_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT field_types_pkey PRIMARY KEY (field_type_id)
);
CREATE TABLE public.financial_settings (
  config_id uuid NOT NULL DEFAULT gen_random_uuid(),
  market_factor double precision NOT NULL DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT financial_settings_pkey PRIMARY KEY (config_id)
);
CREATE TABLE public.formula_output (
  output_id uuid NOT NULL DEFAULT gen_random_uuid(),
  formula_id uuid NOT NULL,
  output_key character varying NOT NULL,
  output_label character varying NOT NULL,
  output_unit_id uuid,
  CONSTRAINT formula_output_pkey PRIMARY KEY (output_id),
  CONSTRAINT formula_output_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES public.formulas(formula_id),
  CONSTRAINT formula_output_unit_id_fkey FOREIGN KEY (output_unit_id) REFERENCES public.units(unit_id)
);
CREATE TABLE public.formulas (
  formula_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  output_label_en character varying,
  output_label_ar character varying,
  expression text NOT NULL,
  output_unit uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  formula_type USER-DEFINED DEFAULT 'MATERIAL'::formula_type,
  name character varying,
  version integer DEFAULT 1,
  CONSTRAINT formulas_pkey PRIMARY KEY (formula_id),
  CONSTRAINT formulas_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
  CONSTRAINT formulas_output_unit_fkey FOREIGN KEY (output_unit) REFERENCES public.units(unit_id)
);
CREATE TABLE public.likes (
  like_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  article_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT likes_pkey PRIMARY KEY (like_id),
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT likes_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(article_id)
);
CREATE TABLE public.material_config (
  config_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT material_config_pkey PRIMARY KEY (config_id),
  CONSTRAINT material_config_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.plan_types (
  plan_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT plan_types_pkey PRIMARY KEY (plan_type_id)
);
CREATE TABLE public.plans (
  plan_id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_type_id uuid,
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  price double precision DEFAULT 0.0,
  duration integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT plans_pkey PRIMARY KEY (plan_id),
  CONSTRAINT plans_plan_type_id_fkey FOREIGN KEY (plan_type_id) REFERENCES public.plan_types(plan_type_id)
);
CREATE TABLE public.predefined_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_text_en character varying NOT NULL,
  question_text_ar character varying NOT NULL,
  answer_text_en text,
  answer_text_ar text,
  display_location character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT predefined_questions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.project_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  category_id uuid,
  values jsonb,
  results jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  estimation_id uuid,
  user_id uuid,
  selected_formula_id uuid,
  selected_config_id uuid,
  formula_version_snapshot integer,
  CONSTRAINT project_details_pkey PRIMARY KEY (id),
  CONSTRAINT project_details_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id),
  CONSTRAINT project_details_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
  CONSTRAINT project_details_estimation_id_fkey FOREIGN KEY (estimation_id) REFERENCES public.estimation(estimation_id),
  CONSTRAINT project_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT project_details_formula_id_fkey FOREIGN KEY (selected_formula_id) REFERENCES public.formulas(formula_id),
  CONSTRAINT project_details_config_id_fkey FOREIGN KEY (selected_config_id) REFERENCES public.material_config(config_id)
);
CREATE TABLE public.projects (
  project_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name character varying NOT NULL,
  description text,
  status USER-DEFINED DEFAULT 'ACTIVE'::project_status,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  subscription_id uuid,
  finished_at timestamp with time zone,
  image_url text,
  CONSTRAINT projects_pkey PRIMARY KEY (project_id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_projects_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(subscription_id)
);
CREATE TABLE public.refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  token text NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.resource_catalog (
  material_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  unit_id uuid,
  material_name_en character varying NOT NULL,
  material_name_ar character varying NOT NULL,
  min_price_usd double precision,
  max_price_usd double precision,
  unit_price_usd double precision,
  default_waste_factor double precision DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  formula_id uuid,
  material_type USER-DEFINED DEFAULT 'PRIMARY'::material_type,
  CONSTRAINT resource_catalog_pkey PRIMARY KEY (material_id),
  CONSTRAINT resource_catalog_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
  CONSTRAINT resource_catalog_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(unit_id),
  CONSTRAINT resource_catalog_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES public.formulas(formula_id)
);
CREATE TABLE public.saves (
  save_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  article_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT saves_pkey PRIMARY KEY (save_id),
  CONSTRAINT saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT saves_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(article_id)
);
CREATE TABLE public.service_config (
  service_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  unit_en character varying,
  unit_ar character varying,
  service_name_en character varying NOT NULL,
  service_name_ar character varying NOT NULL,
  equipment_cost double precision DEFAULT 0.0,
  manpower_cost double precision DEFAULT 0.0,
  install_labor_price double precision DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_config_pkey PRIMARY KEY (service_id),
  CONSTRAINT service_config_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.subscriptions (
  subscription_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  plan_id uuid,
  status USER-DEFINED DEFAULT 'INACTIVE'::subscription_status,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  features_snapshot jsonb,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (subscription_id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id)
);
CREATE TABLE public.tags (
  tag_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_en character varying NOT NULL,
  name_ar character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tags_pkey PRIMARY KEY (tag_id)
);
CREATE TABLE public.units (
  unit_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_en character varying,
  name_ar character varying,
  symbol character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT units_pkey PRIMARY KEY (unit_id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  status character varying,
  password character varying NOT NULL,
  role USER-DEFINED DEFAULT 'CLIENT'::user_role,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  language character varying DEFAULT 'en'::character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);