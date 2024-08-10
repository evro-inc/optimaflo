SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.6
-- Dumped by pg_dump version 15.7 (Ubuntu 15.7-1.pgdg20.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: key; Type: TABLE DATA; Schema: pgsodium; Owner: supabase_admin
--

COPY "pgsodium"."key" ("id", "status", "created", "expires", "key_type", "key_id", "key_context", "name", "associated_data", "raw_key", "raw_key_nonce", "parent_key", "comment", "user_data") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Product" ("id", "active", "name", "description", "image", "metadata", "updated") FROM stdin;
prod_PRqX5eAOJqahLt	t	Analyst	Ideal for basic data management and automation needs.	\N	{"bulletOne": "Affordable Data Automation", "bulletTwo": "User Friendly UI", "bulletThree": "Scaled Data Management"}	1706304176
prod_PRRccTXIcOnyAi	f	Consultancy	Designed for businesses with moderate data management needs, requiring more advanced features.	\N	{"bulletOne": "Enhanced Data Capabilities", "bulletTwo": "Advanced Management", "bulletThree": "Increase Limits on API Calls"}	1706304211
prod_PRqa5fwZDlbQJ5	t	Consultancy	Designed for businesses with moderate data management needs, requiring more advanced features.	\N	{"bulletOne": "Enhanced Data Capabilities", "bulletTwo": "Advanced Management", "bulletThree": "Increase Limits on API Calls"}	1706304286
prod_PRRcQkug6JfGso	f	Enterprise	Premium tier for clients requiring extensive, tailored solutions with zero API limits.	\N	{"bulletOne": "Features included from other tiers", "bulletTwo": "Unlimited API Usage up to Google Limits", "bulletThree": "Unlimited Data Automation"}	1706304327
prod_PRqcZiXISpNuXp	t	Enterprise	Premium tier for clients requiring extensive, tailored solutions with zero API limits.	\N	{"bulletTwo": "Unlimited API Usage up to Google Limits", "bulletThree": "Unlimited Data Automation", "Features included from other tiers": "Features included from other tiers"}	1706304445
prod_PRRcQZKEGg334c	t	Analyst	Perfect for basic data management and automation needs.	\N	{"bulletOne": "Affordable Data Automation", "bulletTwo": "User Friendly UI", "bulletThree": "Scaled Data Management"}	1706306967
\.


--
-- Data for Name: Price; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Price" ("id", "product_id", "active", "description", "unit_amount", "currency", "type", "interval", "interval_count", "trial_period_days", "metadata", "recurringInterval", "recurringIntervalCount") FROM stdin;
price_1OcwqMJpXmm9uoVNCFJnk8Cr	prod_PRqX5eAOJqahLt	t	\N	2999	usd	recurring	month	1	0	\N	month	1
price_1OcwqMJpXmm9uoVNwLsrtCRp	prod_PRqX5eAOJqahLt	t	\N	30000	usd	recurring	year	1	0	\N	year	1
price_1OcwsuJpXmm9uoVNY2ij4Qzr	prod_PRqa5fwZDlbQJ5	t	\N	9999	usd	recurring	month	1	0	\N	month	1
price_1OcwtGJpXmm9uoVNKRyxDQQL	prod_PRqa5fwZDlbQJ5	t	\N	100000	usd	recurring	year	1	0	\N	year	1
price_1Ocwv8JpXmm9uoVNSw6TvufT	prod_PRqcZiXISpNuXp	t	\N	49999	usd	recurring	month	1	0	\N	month	1
price_1OcwvoJpXmm9uoVNAx9OnKFz	prod_PRqcZiXISpNuXp	t	\N	500000	usd	recurring	year	1	0	\N	year	1
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."User" ("id", "stripeCustomerId", "subscriptionId", "subscriptionStatus", "name", "email", "emailVerified", "image", "role") FROM stdin;
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Subscription" ("id", "user_id", "metadata", "price_id", "quantity", "cancel_at_period_end", "created", "current_period_start", "current_period_end", "ended_at", "cancel_at", "canceled_at", "trial_start", "trial_end", "product_id", "subId", "status") FROM stdin;
\.


--
-- Data for Name: CheckoutSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."CheckoutSession" ("id", "paymentStatus", "amountTotal", "currency", "user_id", "subscription_id") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Customer" ("id", "stripe_customer_id", "user_id") FROM stdin;
\.


--
-- Data for Name: Feature; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Feature" ("id", "name", "description") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Invoice" ("id", "status", "created", "paid", "amount_due", "amount_paid", "currency", "customer_id", "due_date", "subscription_id", "user_id") FROM stdin;
\.


--
-- Data for Name: ProductAccess; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ProductAccess" ("id", "productId", "granted", "user_id") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Session" ("id", "user_id", "abandonAt", "clientId", "createdAt", "expireAt", "lastActiveAt", "status", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TierLimit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."TierLimit" ("id", "productId", "featureId", "subscriptionId", "createLimit", "updateLimit", "createUsage", "updateUsage", "deleteLimit", "deleteUsage") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") FROM stdin;
70ab1acb-934c-4203-9777-ebc8de059042	37d2dfb4432d85f396a771f740aacce80d86b426e474c1f21f1e2136997a7617	2024-01-26 00:18:33.469705+00	20230902002803_feature_limits	\N	\N	2024-01-26 00:18:33.362348+00	1
88082bc3-d178-4308-b947-9a5fb981cf55	e0ed00bbde8e15ef3927713b710aa44843e6140849c5cf881725ecee8f704a3b	2024-01-26 00:18:29.289551+00	0_init	\N	\N	2024-01-26 00:18:29.112547+00	1
dac5b626-957e-473c-92dd-c58b18ec8c85	f4ffc15eb56d3ae979c0a1ef247b2b163e7e1bed172f6361e2e7595621488e0e	2024-01-26 00:18:31.355204+00	20230522230447_	\N	\N	2024-01-26 00:18:31.260884+00	1
828fa015-2ddd-41f9-95a9-5debda33c8ee	62c91d445d2586411efc739746cb8405d74b182d4b66119f4dd3b65ecea8ade7	2024-01-26 00:18:29.403021+00	20230508135144_	\N	\N	2024-01-26 00:18:29.32018+00	1
73731d3f-925c-4309-bad1-10b6a8d0211e	98153af861fc134248492cf6557ecd74f09765059ff1f91cfce9905e32724d99	2024-01-26 00:18:29.618382+00	20230512013329_checkout_session_2	\N	\N	2024-01-26 00:18:29.434852+00	1
a3db6a8f-346c-43b6-9d7a-bb8156f0cbad	633881413cc963c94b6ee02fcd99a4b3529aa025adb226107c974f9190150225	2024-01-26 00:18:32.793113+00	20230614153801_gtm_setting_unique_user_id	\N	\N	2024-01-26 00:18:32.697618+00	1
7a3aa869-6de4-4024-af32-e3db8a3a31cf	32e71d081266a04260f20492a7181d2e974007de3e80278e8801a70e3ccb6e56	2024-01-26 00:18:29.747606+00	20230512222310_sub_product	\N	\N	2024-01-26 00:18:29.653938+00	1
7da1ef57-3dab-41c4-b3a0-95adc80a4995	c4d44e4a4648a7befbf32884506234d7da5585175dd2986e73c2f010449b9212	2024-01-26 00:18:31.473617+00	20230523011621_	\N	\N	2024-01-26 00:18:31.386095+00	1
20f7093a-13f7-4772-b819-b718f6192005	00599cd4b403ea9904677194d6bd3df4d9b03cffa889e40ec0dfa6b608baf231	2024-01-26 00:18:29.875712+00	20230513163719_	\N	\N	2024-01-26 00:18:29.78259+00	1
7c5e20a4-8b4c-4d61-84e4-4f7574f34a88	d3706b4ad8e6aeac3181975a3e7cf86698bdfe9c470ff4b9559fafe25b3beab2	2024-01-26 00:18:30.077377+00	20230515154213_invoice	\N	\N	2024-01-26 00:18:29.905463+00	1
0b515cb2-4899-419f-a613-b1595d75e647	13f5a73624c4237047c9cb79c8aad8d2155146559024e1aa94a97cf895093624	2024-01-26 00:18:30.189345+00	20230515155008_invoice_amt_due	\N	\N	2024-01-26 00:18:30.106467+00	1
f5bab15c-6331-42a8-a85e-e8440d9c0701	b192e5c6cc51d1ab991f9370b9970aae8981206a5c0f394b7dd85b161a18a0e4	2024-01-26 00:18:31.669875+00	20230523175325_refactor_invoice	\N	\N	2024-01-26 00:18:31.50172+00	1
bb6f546e-314b-4303-99c4-e169e406136c	40f087215d679953b732acd536fa57e8b86bcfb0a71e73ceccccd46b8d452208	2024-01-26 00:18:30.31295+00	20230515160652_inv_refactor	\N	\N	2024-01-26 00:18:30.223253+00	1
a37c1ed7-24ed-40f5-8af7-1e212bb747a8	96edfcad219c004435c5d0efef8e0d9c546ba946b2c42e6bacc66d03846a22f4	2024-01-26 00:18:30.486341+00	20230515162342_due_date	\N	\N	2024-01-26 00:18:30.352246+00	1
4c4d814f-cb02-4112-865b-9970060d7eb2	8070137e33ba5ff6da2c1846cf4c84eeb3d119595d784554412946d2cb52a55d	2024-01-26 00:18:30.693539+00	20230516173001_sub_update_id	\N	\N	2024-01-26 00:18:30.605763+00	1
d2aab69a-882c-40ef-974a-6c4b7a75c143	4092d1f4046bff27bb621955cfab20a546c59d1ceadc4fc7ffad3315c0c6d093	2024-01-26 00:18:31.788623+00	20230528212945_role_user	\N	\N	2024-01-26 00:18:31.702336+00	1
c9b0c3f1-b7de-4fba-b683-5ad221b86732	bac743c7b09e689deac925de959ac18eda771a78eac0577f3e1a608c94f9afdd	2024-01-26 00:18:30.82278+00	20230516173252_remove_sub_id	\N	\N	2024-01-26 00:18:30.730541+00	1
abcda210-02ac-4766-a336-792dc4ea291c	a095b7f858925464866f6e9e84e09ebae7d9065bfb2151c5089e040a298f951d	2024-01-26 00:18:30.930861+00	20230518155251_invoice	\N	\N	2024-01-26 00:18:30.848936+00	1
57cc9fa3-17a6-408e-9120-8f4bce924d15	4b8dfbbbba44eaa37cd13a820d31faca109e7dfd06f77a46b7d8898fda9099c7	2024-01-26 00:18:32.918034+00	20230614155205_rename_gtm_setting	\N	\N	2024-01-26 00:18:32.831669+00	1
e0bf5e06-a4d9-4631-942b-6f6b704069d1	449911e92b512d689a87732881826eb6f00fa9dded4b3aa88ef7370de1b8f27c	2024-01-26 00:18:31.126727+00	20230522173644_init	\N	\N	2024-01-26 00:18:30.961773+00	1
551ab51b-4a8d-4c92-91d2-a501c5c0e021	d8d4d45aaf98b89a063923a70e9102e141c0466a0ec7a9d7b800cdcd4a22e152	2024-01-26 00:18:31.891507+00	20230602141755_roles	\N	\N	2024-01-26 00:18:31.819198+00	1
1fd21afc-bc17-4051-aa53-2caf7485c952	672c56d7bda14bf778fc989f36e829efbebaae55b4a8dad11724ec8698c8149e	2024-01-26 00:18:31.233557+00	20230522193206_invoice_id_mapping	\N	\N	2024-01-26 00:18:31.159199+00	1
2ef85f72-5a20-4325-90f1-c5f9c2ca6c23	d9d61e1d36db971b83b0dceb5709c6ba1c804ed4bcbcc03c929307c84840bdca	2024-01-26 00:18:31.997951+00	20230602145330_	\N	\N	2024-01-26 00:18:31.922648+00	1
9563f24d-4f6c-4168-bc88-e657824d19bb	7cb750c18846be0c5ac7c38d0740d76347a7ef742f9e8ed2a8d9dfac22eebf77	2024-01-26 00:18:34.332654+00	20230906132525_	\N	\N	2024-01-26 00:18:34.162887+00	1
f1301230-3925-4d5d-91a4-97daff3a23b5	e73e704be6006c55f870a95fef58bf5b359e1f0c291ac33c98ce9489150bbe70	2024-01-26 00:18:32.211277+00	20230607171137_	\N	\N	2024-01-26 00:18:32.029326+00	1
7658fb2f-084e-4a3d-a90e-6a67ead83595	cefbf2d038fe58b1db9c2732c780605187a365a8226ea3b136236cff5d30151b	2024-01-26 00:18:33.027161+00	20230614155502_gtmsetting_refactor	\N	\N	2024-01-26 00:18:32.94933+00	1
d571b169-bd88-461a-aa4c-72d673ed5468	d6d3dc4d58d0ea18460d58cc3852b883e7af18b8e9a4d6c9469f42e1aa8cc109	2024-01-26 00:18:32.362281+00	20230613173612_product_access	\N	\N	2024-01-26 00:18:32.247123+00	1
59fb4977-4828-40e3-8787-71f652c4b901	07321d54fc771e8af5236aeef6b71254a16cf60c9ea5197c91578d70af73d23d	2024-01-26 00:18:32.548204+00	20230614131505_gtm_setting	\N	\N	2024-01-26 00:18:32.39633+00	1
fc2e6bd4-2418-4066-b88f-c575f76eb3ba	65d6817a8365859275b316596020921337e798f5d59abf18128091366db9bd22	2024-01-26 00:18:33.585606+00	20230904180641_limit_feature_col	\N	\N	2024-01-26 00:18:33.50224+00	1
d9fa06b6-6c85-4300-b883-5721b8106537	9dae225fa56b4c660f6cf7bb713a2a527e558e4b195cf1e0c1a34267587d33a9	2024-01-26 00:18:33.222809+00	20230614163405_gtm	\N	\N	2024-01-26 00:18:33.053398+00	1
cb952c5e-6a33-4fb3-8c07-41f856b248d2	c381104e89258578323d70bf767221075e467b6560802277796765d748ba84df	2024-01-26 00:18:33.331895+00	20230614172301_	\N	\N	2024-01-26 00:18:33.252868+00	1
4e5004f5-3549-43ed-978e-c3fc764314d4	f1503195a11c3e8480253c485409cbd38daa7e8c454633ee14f7fdad1bcc70c5	2024-01-26 00:18:34.019761+00	20230905152523_tier_limit_composite	\N	\N	2024-01-26 00:18:33.939296+00	1
c35ddaae-2eb6-4f82-97c8-88255f7032c7	1ec3997a8ee05799abd2965a01d429d0beb58902c615b47199141b48bfe89012	2024-01-26 00:18:33.802676+00	20230904182754_	\N	\N	2024-01-26 00:18:33.617324+00	1
1be9657e-e832-4aaa-998e-e1214be94ece	f5349a3fab696247120c5d3c9de1419d350cb044d91e8f4a1bba74ff3fb2dcba	2024-01-26 00:18:33.91024+00	20230904185347_usage_tier	\N	\N	2024-01-26 00:18:33.830042+00	1
4dfc442f-2de2-4a71-98de-4cf630c2b4d2	7f9ee04afbb0e762704ca23f4fe786aa5a15ac9b2d30fbd56c56f29c8e7b306d	2024-01-26 00:18:34.130019+00	20230906130938_create_update_limit_tiers	\N	\N	2024-01-26 00:18:34.049156+00	1
92b114f0-bdf9-45c8-a0e6-ba3963969e46	29e3508d92760794204613b287b5fa4f469356f92cbd5a71e03cb80a7e3b0913	2024-01-26 00:18:34.558069+00	20231013005450_unique_gtm_entries	\N	\N	2024-01-26 00:18:34.482166+00	1
b95420fd-0fd4-4b68-bf7c-f7c9302fdbcf	46c3d7a7b204ab9f3352db26cc7133c7f4b4f8ab76440d1bfcf0385c6bc58da7	2024-01-26 00:18:34.447932+00	20230906191217_delete_feature_tiers	\N	\N	2024-01-26 00:18:34.36586+00	1
3edc4082-f1db-4b64-8c1f-3d2c98b19a38	d0e3208ecd3d0ae212fee525d1798622fbcce9392f17a7d9e061b5c2ecce3530	2024-01-26 00:18:34.825612+00	20231116174147_clerk	\N	\N	2024-01-26 00:18:34.589902+00	1
1558cedb-1988-4ffe-8408-3db93acb0e64	54d059592f83ee4e4a74e4757e2c819f05a44de5fff4f3903d7596bcf8ba5d82	2024-01-26 00:18:34.947331+00	20231119160800_remove_uuid	\N	\N	2024-01-26 00:18:34.860449+00	1
1a32028a-efab-401b-9042-00e3d2adf2d0	5197d4f2d3ade200faeaacaae543716de53e268bb26fba514319fc1559de8a02	2024-01-26 00:18:35.06133+00	20231119164332_del_verification_table	\N	\N	2024-01-26 00:18:34.976131+00	1
124f28ef-db9f-434e-8576-438f3949c917	23ffd328fa3596625f4132fb683f872459a7e75ed5100c4c5d8225e4091edf2c	2024-01-26 00:18:35.163395+00	20231119202719_session_clerk	\N	\N	2024-01-26 00:18:35.09087+00	1
cfc7632c-c3be-4d50-a504-cc8e60256f0e	d9aa7270669a43a020f14c27088d8a68adbc930e7057e454f37b004360580f52	2024-01-26 00:18:35.361843+00	20231119203414_session_int	\N	\N	2024-01-26 00:18:35.193688+00	1
0da9c58d-e75d-4447-9d0e-6eaba81f12a4	8da31e5813cbc22b3d95c2526653755024b92e36502c59c5d289b94356cb46f3	2024-01-26 00:18:35.461979+00	20231119203744_remove_session_fields	\N	\N	2024-01-26 00:18:35.392518+00	1
ff2f1917-aed2-41a9-ae09-d2ac6204c9b1	4eca9d3c00152fc300dc429c7c2a4936c4e5284098e48920797f2216c52b8f49	2024-01-26 00:18:35.569762+00	20231119204032_removed_accounts_table	\N	\N	2024-01-26 00:18:35.495456+00	1
b02423eb-566f-41fd-90fc-70d04af183c5	b24cc05eda640e73d0962d5e307d8e5facd3ad36a7ae1e8be740e0bd82c94474	2024-01-26 00:18:35.68702+00	20231122023841_update_time_gtm_fetch_setting	\N	\N	2024-01-26 00:18:35.601116+00	1
a249d378-c0d9-4aff-84ec-a3fcb63c4f59	298037b584dbde931c69fb229a2dbcae4b590f5155e55180e82f064a85be1241	2024-01-26 00:18:35.886846+00	20231122025359_	\N	\N	2024-01-26 00:18:35.717896+00	1
\.


--
-- Data for Name: gtm; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gtm" ("id", "user_id", "account_id", "container_id", "workspace_id") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY "vault"."secrets" ("id", "name", "description", "secret", "key_id", "nonce", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: key_key_id_seq; Type: SEQUENCE SET; Schema: pgsodium; Owner: supabase_admin
--

SELECT pg_catalog.setval('"pgsodium"."key_key_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
