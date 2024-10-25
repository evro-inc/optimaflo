SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1 (Ubuntu 15.1-1.pgdg20.04+1)
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

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
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
prod_QfmmFkzIUNh99w	t	Analyst	Ideal for basic data management and automation needs.	\N	{"tier": "analyst"}	1723850486
prod_Qfmn4tshwQDaDG	t	Consultant	Designed for businesses with moderate data management needs, requiring more advanced features.	\N	{"tier": "consultant"}	1723850494
prod_QfmorrgXFyWRmN	t	Enterprise	Premium tier for businesses requiring extensive, tailored solutions with no limits on usage.	\N	{"tier": "enterprise"}	1723855074
\.


--
-- Data for Name: Price; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Price" ("id", "product_id", "active", "description", "unit_amount", "currency", "type", "interval", "interval_count", "trial_period_days", "metadata", "recurringInterval", "recurringIntervalCount") FROM stdin;
price_1PoRCVJpXmm9uoVNbGj8zDSD	prod_QfmmFkzIUNh99w	t	\N	2999	usd	recurring	month	1	0	\N	month	1
price_1PoRCVJpXmm9uoVNTwAQ6nyP	prod_QfmmFkzIUNh99w	t	\N	29999	usd	recurring	year	1	0	\N	year	1
price_1PoRDZJpXmm9uoVNh2HbxSnG	prod_Qfmn4tshwQDaDG	t	\N	99999	usd	recurring	year	1	0	\N	year	1
price_1PoRDZJpXmm9uoVNGiKz6wcf	prod_Qfmn4tshwQDaDG	t	\N	9999	usd	recurring	month	1	0	\N	month	1
price_1PoREZJpXmm9uoVNqq71jBtm	prod_QfmorrgXFyWRmN	t	\N	49999	usd	recurring	month	1	0	\N	month	1
price_1PoREZJpXmm9uoVNZGhlgCkY	prod_QfmorrgXFyWRmN	t	\N	499999	usd	recurring	year	1	0	\N	year	1
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."User" ("id", "stripeCustomerId", "subscriptionId", "subscriptionStatus", "name", "email", "emailVerified", "image", "role") FROM stdin;
user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	\N	\N	\N	Ev Ro	crypto.evro@gmail.com	\N	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJsNGNHQlMxUUNNN09KbnZXaTZvdDZqWnVtayJ9	USER
user_2kprK1cBrS7au2ilAavEW74EoQx	\N	\N	\N	OptimaFlo null	optimaflo@gmail.com	\N	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18ya3BySzQ3ZDJyZGJTRGpmWHRBN0Fqa0V1VE8ifQ	USER
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Subscription" ("id", "user_id", "metadata", "price_id", "quantity", "cancel_at_period_end", "created", "current_period_start", "current_period_end", "ended_at", "cancel_at", "canceled_at", "trial_start", "trial_end", "product_id", "subId", "status") FROM stdin;
cm074ijbi0002d2snexcsz5tw	user_2kprK1cBrS7au2ilAavEW74EoQx	\N	price_1PoREZJpXmm9uoVNZGhlgCkY	1	f	2024-08-23 19:47:33+00	2024-08-23 19:47:33+00	2025-08-23 19:47:33+00	\N	\N	\N	\N	\N	prod_QfmorrgXFyWRmN	sub_1Pr3SLJpXmm9uoVNuROZ0ek6	active
clzxd0f7n0000tjoin9onzoaz	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	\N	price_1PoRDZJpXmm9uoVNGiKz6wcf	1	f	2024-08-16 23:47:42+00	2024-10-16 23:47:42+00	2024-11-16 23:47:42+00	\N	\N	\N	\N	\N	prod_Qfmn4tshwQDaDG	sub_1PoZruJpXmm9uoVN94BGbo2M	active
\.


--
-- Data for Name: CheckoutSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."CheckoutSession" ("id", "paymentStatus", "amountTotal", "currency", "user_id", "subscription_id") FROM stdin;
cs_test_b1beLy9RVcqgR4KexReEAt3sr7zp1qUwQI8PxFf5FkWGVedmt8PFq5Kwig	paid	9999	usd	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	clzxd0f7n0000tjoin9onzoaz
cs_test_b12MSRRc2Pxo9J5opjQTJJZuD5RgI97y0AZc7ihXi13VZTma67myWkJjA6	paid	499999	usd	user_2kprK1cBrS7au2ilAavEW74EoQx	cm074ijbi0002d2snexcsz5tw
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Customer" ("id", "stripe_customer_id", "user_id") FROM stdin;
clzxc3xmr003tlibv86bf1w41	cus_QfvKYYCL9PFdKp	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V
cm074hz0k0001d2sntdhbbr92	cus_QiUQvU3S7vU8Ys	user_2kprK1cBrS7au2ilAavEW74EoQx
\.


--
-- Data for Name: Feature; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Feature" ("id", "name", "description") FROM stdin;
clzwt0hb90000i6ouz3k5z64f	GTMBuiltInVariables	GTMBuiltInVariables
clzwt0hb90001i6ouehex626n	GTMFolders	GTMFolders
clzwt0hb90002i6oukl8cpy03	GTMTags	GTMTags
clzwt0hb90003i6ouyhy1jm5s	GTMTransformations	GTMTransformations
clzwt0hb90004i6ouoodtwuv7	GTMTemplates	GTMTemplates
clzwt0hb90005i6ouf1ddivig	GTMWorkspaces	GTMWorkspaces
clzwt0hb90006i6ou41xvmrul	GTMZones	GTMZones
clzwt0hb90007i6ou7rw9oje1	GTMVersions	GTMVersions
clzwt0hb90008i6ouprc1z3c4	GTMTriggers	GTMTriggers
clzwt0hb90009i6ougttx8nrz	GA4Accounts	GA4Accounts
clzwt0hb9000ai6ouzl77hk0w	GA4AdLinks	GA4AdLinks
clzwt0hb9000bi6ou2q4f118d	GA4FBLinks	GA4FBLinks
clzwt0hb9000ci6ou1gjwhltr	GA4Streams	GA4Streams
clzwt0hb9000di6oux6zmk5zj	GA4CustomMetrics	GA4CustomMetrics
clzwt0hb9000ei6ouxeu2hchk	GA4CustomDimensions	GA4CustomDimensions
clzwt0hba000fi6ouqcct3hmr	GA4ConversionEvents	GA4ConversionEvents
clzwt0hba000gi6ou3g8sjsa7	GA4Properties	GA4Properties
clzwt0hba000hi6ousvfd9wyc	GA4AccountAccess	GA4AccountAccess
clzwt0hba000ii6ou9it01909	GA4PropertyAccess	GA4PropertyAccess
clzwt0hba000ji6ou0dvrb03u	GA4Audiences	GA4Audiences
clzwt0hba000ki6oudwc6rmdo	GA4KeyEvents	GA4KeyEvents
clzwt0hba000li6ou6g81fy7f	GTMEnvs	GTMEnvs
clzwt0hba000mi6ouzjdtptce	GTMPermissions	GTMPermissions
clzwt0hba000ni6ouv5bc7n3c	GTMVariables	GTMVariables
clzwt0hba000oi6ou2lwb82sf	GTMClients	GTMClients
clzwt0hba000pi6ouuc4i86sl	GTMContainer	GTMContainer
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Invoice" ("id", "status", "created", "paid", "amount_due", "amount_paid", "currency", "customer_id", "due_date", "subscription_id", "user_id") FROM stdin;
in_1QAgwhJpXmm9uoVN1SOGoEZb	paid	2024-10-16 23:48:03+00	t	9999	9999	usd	cus_QfvKYYCL9PFdKp	2024-11-15 23:48:03+00	clzxd0f7n0000tjoin9onzoaz	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V
in_1Pr3SLJpXmm9uoVNB5BZWI6z	open	2024-08-23 19:47:33+00	f	499999	0	usd	cus_QiUQvU3S7vU8Ys	2024-09-22 19:47:33+00	cm074ijbi0002d2snexcsz5tw	user_2kprK1cBrS7au2ilAavEW74EoQx
in_1PoZruJpXmm9uoVNS3XULjq1	paid	2024-08-16 23:47:42+00	t	9999	9999	usd	cus_QfvKYYCL9PFdKp	2024-09-15 23:47:42+00	clzxd0f7n0000tjoin9onzoaz	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V
in_1PzoerJpXmm9uoVN1Pto1t74	paid	2024-09-16 23:48:41+00	t	9999	9999	usd	cus_QfvKYYCL9PFdKp	2024-10-16 23:48:41+00	clzxd0f7n0000tjoin9onzoaz	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V
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
sess_2kkE3V1aFRNGuYeidWywEjApUm8	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726410974765	client_2kkE2yNLcQr251b9SsSl70hiTZD	1723818974765	1724423774765	1723905610114	ended	1723905627608
sess_2kn3jH27Fn2LY0vSfv2svCoi7JC	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726497646926	client_2kn3iBDzhO7BFu1yx7FyQR7ETfj	1723905646927	1724510446926	1723905646926	ended	1723907877357
sess_2kn8HJ3Ot2v549Tm9WWbQTlKVo4	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726499890981	client_2kn8H2JddphClb8sqQzO8v077g3	1723907890981	1724512690981	1723907890981	ended	1723989320696
sess_2n9r2YablkyGoF6qt6kiLiuagOp	user_2kprK1cBrS7au2ilAavEW74EoQx	1730987925354	client_2n7Y4KvFWbwnD1BkxJxcqJk8M56	1728395925354	1729000725354	1728395925354	active	1728395925391
sess_2l4bOeqTexrDOOaqclgyAVni7Y3	user_2kprK1cBrS7au2ilAavEW74EoQx	1727034264798	client_2l4bNHgnuWO9lk8t0UnCj3wTAZQ	1724442264798	1725047064798	1724442264798	ended	1724442273743
sess_2nCXVmXtNEOgoLegopvyVI4wlBN	user_2kprK1cBrS7au2ilAavEW74EoQx	1731070057418	client_2nCXTjKIWTEtkZ8PFTKJ5zg7xkC	1728478057419	1729082857418	1728478057418	active	1728478057472
sess_2kprNO0laKeOwWHa56vcoW898Pq	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726583317003	client_2kprMwEhDNsE6xHHs6jHCBRlVsb	1723991317003	1724596117003	1724076329585	ended	1724076633714
sess_2kpnLmmiV5VPMKX0yyM4k2hfyQK	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726581331863	client_2kpnLMnjqvNDaNvMibKuG4Ntq9S	1723989331863	1724594131863	1724076701008	ended	1724076703980
sess_2kseLGatRTMe6dzWESi8Lz9HoVp	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726668653074	client_2kseJzrtFJYJ2uUiBJem0bhUBzU	1724076653074	1724681453074	1724076715199	ended	1724076724223
sess_2ksenlsWj49elHxpN08XD33Yy3a	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726668880134	client_2ksenEGPGWQPwgyVOZ7ciLxJae0	1724076880134	1724681680134	1724076880134	active	1724076880164
sess_2ksgmKF2ddqVQUj2OTRDtzI0ai5	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726669855619	client_2ksgkWE7pHAyvwgcgNMoxo7oGo0	1724077855619	1724682655619	1724077855619	active	1724077855654
sess_2kskL5vlsF9E0u3tjvxvHw183PF	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726671612394	client_2kskJCzrlLePneS61PL6aDnu0So	1724079612394	1724684412394	1724079612394	ended	1724079649841
sess_2kskRsArWiPBGqLgiWli2qBveeG	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726671666118	client_2kskRngAKJgCuUxcMhdOq6bDZEs	1724079666118	1724684466118	1724092831665	ended	1724095096512
sess_2ktFjJIx54zVMvqV3E12AQqv1hs	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726687099695	client_2ktFjHTiSDvQR8BzoIGDSBD4hY9	1724095099695	1724699899695	1724095099695	ended	1724095123317
sess_2ktFnsC5QpZ10mjTmk65ONWT0wG	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726687135363	client_2ktFnkh6y2w9hw3Ui8HOR0CpPnT	1724095135363	1724699935363	1724095135363	active	1724095135402
sess_2ktv7AYKwexzzL3ny9TL2U0iC2U	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726707517963	client_2ktv5j7RH1LkVo1pZNdRPE1W7VJ	1724115517964	1724720317963	1724181092402	ended	1724183215155
sess_2kw8O8p4oTSAABLTIORK6ql3auF	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1726775243630	client_2kw8N2E1CNvoFCBaRhFZsOk097C	1724183243630	1724788043630	1724426770093	ended	1724426880123
sess_2l48kfbi2k7GdJgq5QQIRIuH0gR	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727020132834	client_2l48dQaoqj4f4QUcM63kJL28l5b	1724428132834	1725032932834	1724441870758	ended	1724441887113
sess_2l4bB6BJbPJzWETcsL3ffFRiYzZ	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727034156389	client_2l4bAxFTgr6TK6HwUZHeFy6kSkS	1724442156389	1725046956389	1724442156389	ended	1724442190967
sess_2l4bGXLDYLOKBKLHzr07dnrVlud	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727034200947	client_2l4bGQtleDUsC7b7ys4KQheYKPk	1724442200948	1725047000947	1724442200947	ended	1724442229507
sess_2nTubHEyZLzvN9NMI2aYwOtpoTH	user_2kprK1cBrS7au2ilAavEW74EoQx	1731601456091	client_2nTuYmCkP1wGIgVqpEKAV9bHhGS	1729009456091	1729614256091	1729020716321	removed	1729020717634
sess_2nZREoPHvpp67pR6xpMargtmlv0	user_2kprK1cBrS7au2ilAavEW74EoQx	1731770502310	client_2nUITuvxFPoyU0HoSJMhyyF5Wz4	1729178502310	1729783302310	1729178502310	active	1729178502352
sess_2l4c2e4XXSDd97htnGNuXbuA1Uj	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727034583181	client_2l4c2aYeT9Vkfab3v1HhOLrXypW	1724442583181	1725047383181	1724442583181	active	1724442583213
sess_2lA30WBPxSonTRcd9QNNzLaWp4Y	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727200830621	client_2lA2z3iSqV4JE7pqYudR2WBwsj8	1724608830622	1725213630621	1724686914221	ended	1724687231785
sess_2lCbwn084nWgn3U42HBYJvY2B3z	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727279246359	client_2lCbvetU0lEHEBtNJQDeVkcI74j	1724687246359	1725292046359	1724688938298	ended	1724689350726
sess_2lCgWSkzgI8r7d4CkyX6cmRqI1W	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727281503851	client_2lCgWLex72fi8vXOrT0WnHDEQVt	1724689503851	1725294303851	1724689503851	active	1724689503891
sess_2lCgHyFUqDFU0BytGFE281GXQst	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727281388601	client_2lCgHt80bHM9opdxUiwpiA6Oko8	1724689388601	1725294188601	1724689388601	ended	1724689457984
sess_2lCh8a7yfKmYDlANr1Or4pQGtNJ	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727281806936	client_2lCh6zD1AhyWd9ZeHOJQRIoKo6N	1724689806936	1725294606936	1724718861491	ended	1724721103188
sess_2lDiabbZHEWRH5IY5E2hUOHL7iT	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727313111535	client_2lDiaP48ZiqsiVhdmYkYQUGHTtB	1724721111535	1725325911535	1724721111535	active	1724721111574
sess_2lGVbHPSwhkCURYy6242nUtvb83	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727398469474	client_2lGVaD0NFHlqHsonw5BMT1HsDtV	1724806469474	1725411269474	1724806469474	active	1724806469515
sess_2lL48Qjr9Y4N4eOLfRJ9WLCwqKd	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727537862514	client_2lL44aQF6bTcR5vaXbhAsg4p6x5	1724945862514	1725550662514	1724979125639	ended	1724979464515
sess_2lMAFZHqMaxaOUJXVaNXQytKhra	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727571468645	client_2lMAFZDP7EDty2W7bWERlkBCkOa	1724979468645	1725584268645	1724979585766	ended	1724979700695
sess_2lMAjAz46NzMXAPFCmXAz0lE2ni	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727571703652	client_2lMAj3yyCWKyKrzak0w9AteNh6k	1724979703652	1725584503652	1725035210804	ended	1725035275281
sess_2lNzPxNZP9szNiy94t3E1fs8LDr	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727627301546	client_2lNzN9OrOGRB9fmP77FiZFCsbKu	1725035301546	1725640101546	1725120151489	ended	1725120369751
sess_2lQlrcsqOdpOxkGIYIc4SAPOXTX	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727712380269	client_2lQlrUbj06MnL93iOgMZKYv7C6q	1725120380269	1725725180269	1725120380269	active	1725120380302
sess_2lR23cFt5lT9N5130bs6MQ3NT8Y	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727720369059	client_2lR227BY8pj23WfPXVnyBMGKacY	1725128369059	1725733169059	1725128574529	ended	1725128577098
sess_2lR2Vp73UphIPoZLTSS2qNesQ1d	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727720594376	client_2lR2Vi0vZQ4CAIN4qhlfwCFwirs	1725128594376	1725733394376	1725129256726	ended	1725129262793
sess_2lR3u5GW8Kt1JWXrzTTgkVtmpV1	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727721280986	client_2lR3tx0daGd35B3rHTX0HflrMsa	1725129280986	1725734080986	1725200695292	ended	1725200696076
sess_2lTOgfWCl5lMrap2tCLkyCCZLTD	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727792712476	client_2lTOgZxDuKFPCTdcnTLNPPhtaW8	1725200712476	1725805512476	1725214670967	ended	1725214672764
sess_2lTr30INNsih0zsnxySF1c5N1LU	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727806704164	client_2lTr1q6NQqB66K91wnKhk1yVKBG	1725214704164	1725819504164	1725216593842	ended	1725216597281
sess_2lTuujUHwmh9EbupkNn3onOXZUF	user_2kkE3Tj3cWpB8gvIeqJMPeETv0V	1727808611915	client_2lTuuQQf2uN26c4kHqkZQRMS6Od	1725216611915	1725821411915	1725216611915	ended	1725216636236
sess_2kprK0bRcCYKMyOmiPLiHSUDg4U	user_2kprK1cBrS7au2ilAavEW74EoQx	1726583291314	client_2kprJUWA0LfOW3QVx2gxNZjUNWH	1723991291314	1724596091314	1723991291314	ended	1723991310339
sess_2n9ra7dzZLVpUAsdHZVTUe0n9PD	user_2kprK1cBrS7au2ilAavEW74EoQx	1730988192383	client_2n9rXnX2JsqqeXRHK0yhg0DljCs	1728396192383	1729000992383	1728399005451	removed	1728399025764
sess_2n9xLkXq5RT8WMIcAtZ03qaSKLE	user_2kprK1cBrS7au2ilAavEW74EoQx	1730991038659	client_2n9rXnX2JsqqeXRHK0yhg0DljCs	1728399038660	1729003838659	1728401626122	removed	1728401628392
sess_2nOsRplMWXoEKWaT3siqkM2egol	user_2kprK1cBrS7au2ilAavEW74EoQx	1731447450289	client_2nOsPhHhilIH2xsprM7KSwwn6Lr	1728855450289	1729460250289	1728857514359	removed	1728857522574
sess_2nUHRtLR6yE23GBSPMUR6H3UKLC	user_2kprK1cBrS7au2ilAavEW74EoQx	1731612729492	client_2nTuYmCkP1wGIgVqpEKAV9bHhGS	1729020729492	1729625529492	1729020729492	active	1729020729556
sess_2nZSk9KYfvarWTNpUuTsBZNtbvV	user_2kprK1cBrS7au2ilAavEW74EoQx	1731771244347	client_2nZShswvkqiz1VMwfJUGAMIfMn8	1729179244347	1729784044347	1729270190824	removed	1729473164685
sess_2nl4bJbXOLAypPRBqhnwL2utL0f	user_2kprK1cBrS7au2ilAavEW74EoQx	1732126398947	client_2nl4YMBNfqKhHl9ob2ILgHhdnri	1729534398947	1730139198947	1729612124715	removed	1729612128154
sess_2nq2tRieqtw2L1mGsVnhNT3MzzM	user_2kprK1cBrS7au2ilAavEW74EoQx	1732278499287	client_2nq2q1AS0JMEmFbAwWUMEEFR7k5	1729686499287	1730291299287	1729689006848	removed	1729689122133
sess_2nsr2CPuZS8QWRlwQhkikhBJtRW	user_2kprK1cBrS7au2ilAavEW74EoQx	1732364414785	client_2nqwnQISBlB4M76UZpLaApvu3Ll	1729772414791	1730377214785	1729774608162	removed	1729774610980
sess_2nsvUnWbhcaLjqpI6Q8lH3qZeTE	user_2kprK1cBrS7au2ilAavEW74EoQx	1732366615246	client_2nqwnQISBlB4M76UZpLaApvu3Ll	1729774615251	1730379415246	1729774615246	active	1729774615298
sess_2nA2buRb8pkC4mE3YinyC7rVJpa	user_2kprK1cBrS7au2ilAavEW74EoQx	1730993634704	client_2n9rXnX2JsqqeXRHK0yhg0DljCs	1728401634704	1729006434704	1728425481370	removed	1728425620919
sess_2nOxNpRlMvTrTO2FxY2YakHcFRm	user_2kprK1cBrS7au2ilAavEW74EoQx	1731449885568	client_2nOxLJgU6L7yExOTzTSOWjxprwd	1728857885568	1729462685568	1728926140969	removed	1728926354274
sess_2nUIWbhp74G6I2aiTasVvXgyVFo	user_2kprK1cBrS7au2ilAavEW74EoQx	1731613260241	client_2nUITuvxFPoyU0HoSJMhyyF5Wz4	1729021260241	1729626060241	1729106961485	removed	1729107006801
sess_2nj4aTehDCWJX21r8XcjxBx7HFb	user_2kprK1cBrS7au2ilAavEW74EoQx	1732065214298	client_2nZShswvkqiz1VMwfJUGAMIfMn8	1729473214298	1730078014298	1729524107524	removed	1729524243323
sess_2nncEJRIlId9mFX7FWfHVCnbueE	user_2kprK1cBrS7au2ilAavEW74EoQx	1732204167327	client_2nl4YMBNfqKhHl9ob2ILgHhdnri	1729612167327	1730216967327	1729686111311	removed	1729686113606
sess_2nqNcMTszcZEBpQb3ydw2tgefcC	user_2kprK1cBrS7au2ilAavEW74EoQx	1732288724250	client_2nq2q1AS0JMEmFbAwWUMEEFR7k5	1729696724251	1730301524250	1729696724250	active	1729696724331
sess_2nq8DkKZE0D0FUCrB1sLF3EE0gh	user_2kprK1cBrS7au2ilAavEW74EoQx	1732281127371	client_2nq2q1AS0JMEmFbAwWUMEEFR7k5	1729689127371	1730293927371	1729696530752	removed	1729696718403
sess_2nvyxv59TRjXiytVa2nbDVtyrvS	user_2kprK1cBrS7au2ilAavEW74EoQx	1732460093371	client_2nvyvlnLGLPWjI6TVCQR1bNSkMB	1729868093379	1730472893371	1729868093371	active	1729868093427
sess_2nAqVmv4j5AMUwCSas4Q0GHGwoR	user_2kprK1cBrS7au2ilAavEW74EoQx	1731018253384	client_2nApmAgZ7LvFkxrmqOqER6H1XBc	1728426253385	1729031053384	1728429581201	removed	1728429657780
sess_2kimeNz8Jr63mgCTsyUTmUctSED	user_2kprK1cBrS7au2ilAavEW74EoQx	1726366865397	client_2kimdw7hx6IHpVaPYxsnUDwJ142	1723774865397	1724379665397	1723774865397	ended	1724032290962
sess_2l4bWMvgS0z2JpgiTVmklIBjFQs	user_2kprK1cBrS7au2ilAavEW74EoQx	1727034326192	client_2l4bW6QOhm4qmXpyYzeH4ThOuzG	1724442326192	1725047126192	1724442421489	ended	1724442550763
sess_2lTv4m3X2gdWB3aInKrb70T35HQ	user_2kprK1cBrS7au2ilAavEW74EoQx	1727808691719	client_2lTv20FnSeRFrHK39TNcQidrLBd	1725216691719	1725821491719	1725218979718	ended	1725218983094
sess_2lTzkA8vJ8zUBpXsA1lwaayEg29	user_2kprK1cBrS7au2ilAavEW74EoQx	1727810994835	client_2lTzk5H1w4tcjSpC4rWz2q5LLwp	1725218994835	1725823794835	1725219027326	ended	1725219030125
sess_2lTzpv03c4ND02P4htemrqYqFm5	user_2kprK1cBrS7au2ilAavEW74EoQx	1727811040475	client_2lTzpqEZntQQDUVTakR63lBwIs2	1725219040475	1725823840475	1725219232545	ended	1725219235068
sess_2lU0FPEp0NsnZ8Dznn7stTJfegd	user_2kprK1cBrS7au2ilAavEW74EoQx	1727811243736	client_2lU0FVU8J0vxbyuRDQr6Me8lYO9	1725219243736	1725824043736	1725219304590	ended	1725219323522
sess_2lU0QClJ5Y3g3jxn5CoCI9E1XqP	user_2kprK1cBrS7au2ilAavEW74EoQx	1727811328419	client_2lU0PzjtrSOza72v0Jv8Qmt5JX1	1725219328420	1725824128419	1725219345611	ended	1725219347643
sess_2lU3KfyjyApRhcVOz1aDiKDyYru	user_2kprK1cBrS7au2ilAavEW74EoQx	1727812765217	client_2lU3KcJg4pg7yg0BRw7JQYDpKhP	1725220765217	1725825565217	1725220838024	ended	1725220841728
sess_2lU3V6fTpeZAPL3rpgUPyMFkaQp	user_2kprK1cBrS7au2ilAavEW74EoQx	1727812848214	client_2lU3UyYoGISNJ66A00qBQHGsdzu	1725220848214	1725825648214	1725317595723	ended	1725317652856
sess_2lXDkY4XAs28zwxtlAgO0xwQVN1	user_2kprK1cBrS7au2ilAavEW74EoQx	1727909670514	client_2lXDkLeksNd25QLyHm9suprPib8	1725317670514	1725922470514	1725317670514	active	1725317670551
sess_2lXSNWuE5v4yPe4qbVpSH8gHW6Z	user_2kprK1cBrS7au2ilAavEW74EoQx	1727916888756	client_2lXSLyhbqe9rU32W612xR7n9lpL	1725324888756	1725929688756	1725392022072	ended	1725392779782
sess_2lZg0aPuBd7TqkUdiGh9zWwkuEr	user_2kprK1cBrS7au2ilAavEW74EoQx	1727984790607	client_2lZg02ZYHnrJxtEmpUbUviTtNvS	1725392790607	1725997590607	1725392790607	active	1725392790635
sess_2lZgu9BaOBcM3LKh4KXypSY2sU0	user_2kprK1cBrS7au2ilAavEW74EoQx	1727985232816	client_2lZgsyf6zTuZiK5B77d5xFt0AEH	1725393232816	1725998032816	1725406558445	ended	1725406617615
sess_2la84cRXWTocA5G74w2By0xtdPH	user_2kprK1cBrS7au2ilAavEW74EoQx	1727998636748	client_2la83UV8UpgtMtn7UxOTe9pnofH	1725406636748	1726011436748	1725406636748	active	1725406636780
sess_2laB9MgHavTrfPKulEGVZumIYhz	user_2kprK1cBrS7au2ilAavEW74EoQx	1728000154720	client_2laB7z5FxqCHJrDeTGyOIoomPEC	1725408154720	1726012954720	1725636696743	ended	1725636702837
sess_2lheRW1Tq00qmspeus0t2SfxRUf	user_2kprK1cBrS7au2ilAavEW74EoQx	1728228727264	client_2lheRLOz2HbDB3dnxUQEFBgm9wj	1725636727264	1726241527264	1725636727264	active	1725636727325
sess_2lkDRQgrBlyGxjpuqZQweYflqCK	user_2kprK1cBrS7au2ilAavEW74EoQx	1728307171725	client_2lkDPk82fgqJOKxwz88DV84Gfkb	1725715171725	1726319971725	1725721080179	ended	1725721088584
sess_2lkPSs3WwNVBCAhrXPzpX6jHePg	user_2kprK1cBrS7au2ilAavEW74EoQx	1728313103819	client_2lkPRRVLdKxHtuudYGWtuePuQvZ	1725721103819	1726325903819	1725721103819	active	1725721103846
sess_2lkQZuXqSJud825Si9kVDjuXE8j	user_2kprK1cBrS7au2ilAavEW74EoQx	1728313653981	client_2lkQX5Hofh9UQKEaTZYGTsivVjT	1725721653981	1726326453981	1725730603536	ended	1725731119821
sess_2lkjnAw5zn2BNpSbMK8dC6qv57R	user_2kprK1cBrS7au2ilAavEW74EoQx	1728323132595	client_2lkjn2vFxowZNP2YkGCSuHEVfHh	1725731132595	1726335932595	1725748068676	ended	1725748070421
sess_2llI9asJuAI7k5FAJXfsHzAEzee	user_2kprK1cBrS7au2ilAavEW74EoQx	1728340085749	client_2llI9Y2DflTbxpg6yxpgai6uFSz	1725748085749	1726352885749	1725750418909	ended	1725750672798
sess_2llO6AqCjfVQB5DomzhEsGA184W	user_2kprK1cBrS7au2ilAavEW74EoQx	1728343018298	client_2llO3gR4rvypfqk5puTRWP0s7PM	1725751018298	1726355818298	1725758646371	ended	1725758903248
sess_2lle7C90tTMzFe6jRo7NtuXylto	user_2kprK1cBrS7au2ilAavEW74EoQx	1728350920250	client_2lle5yrCVd8lPH4DiGrQhcRNQat	1725758920250	1726363720250	1725758920250	active	1725758920281
sess_2ln4bWhToSpPsn76TxxB7zsAxj2	user_2kprK1cBrS7au2ilAavEW74EoQx	1728394577635	client_2ln4ZoEcEuhKz6VypH3uE5vXINZ	1725802577636	1726407377635	1725811582102	ended	1725811586170
sess_2lnMsUXHlfCi1SsrLxLGsDljeIS	user_2kprK1cBrS7au2ilAavEW74EoQx	1728403593728	client_2lnMsVcwFc24UeDPC0ZimvTKPFa	1725811593728	1726416393728	1725829957246	ended	1725829995463
sess_2lnyFO8uRqA0nWTL6SBi5JK3EKs	user_2kprK1cBrS7au2ilAavEW74EoQx	1728422030163	client_2lnyCOZsttyBVtlk9sqpIQt8657	1725830030163	1726434830163	1725835945797	ended	1725836121729
sess_2loBJwNNUTshXTRsexBKMIq5Tcq	user_2kprK1cBrS7au2ilAavEW74EoQx	1728428480545	client_2loBIcHmuDSIc36z1Phygt1SZOC	1725836480546	1726441280545	1725836859625	ended	1725836861391
sess_2loDH7RSnWrNyZAX6QMdBKYLb4R	user_2kprK1cBrS7au2ilAavEW74EoQx	1728429444624	client_2loDH3WjEgb6ptB9x9H40uAhn7X	1725837444624	1726442244624	1725837444624	ended	1725837463464
sess_2loC6LqKWUrvt10wnrRqgd9BYFk	user_2kprK1cBrS7au2ilAavEW74EoQx	1728428865319	client_2loC6FINDOzZy4lZx7tZdxpH0Yj	1725836865319	1726441665319	1725836865319	active	1725836865386
sess_2loC9pifTsFhSxrOEtcP5DnR4GT	user_2kprK1cBrS7au2ilAavEW74EoQx	1728428893478	client_2loC9rKXgJXIhHDxaknLReI9gzd	1725836893478	1726441693478	1725837346061	ended	1725837349078
sess_2loD5davpPiabvsUdfQqHYc5q1y	user_2kprK1cBrS7au2ilAavEW74EoQx	1728429353265	client_2loD5YzzmY1IUN7g96VHmHT3lx2	1725837353265	1726442153265	1725837353265	ended	1725837369018
sess_2loDEVwtfjKlcoCIMVLbFmVSz5s	user_2kprK1cBrS7au2ilAavEW74EoQx	1728429423662	client_2loDEVCkXuca7ky4QrvyWB1Dbws	1725837423662	1726442223662	1725837439633	ended	1725837441285
sess_2loDKuw335kVCGD2CWeGtPnHgCA	user_2kprK1cBrS7au2ilAavEW74EoQx	1728429474937	client_2loDKrXMaUnGNhbhWozD2k4d0NU	1725837474937	1726442274937	1725837474937	ended	1725837486822
sess_2loDMhtpA6G18M5uB6kZer7pqiZ	user_2kprK1cBrS7au2ilAavEW74EoQx	1728429489950	client_2loDMjYIl0znd2ZzGTGd61gcrBy	1725837489950	1726442289950	1725837489950	active	1725837489976
sess_2loN6Xuk4c1MegRo51rI2PMr6XQ	user_2kprK1cBrS7au2ilAavEW74EoQx	1728434294894	client_2loN4hRjNZ6FerftadPP74cbyPV	1725842294894	1726447094894	1725902525423	ended	1725902526921
sess_2lqLHNM6nCzHgCp12WlqRuJnWe9	user_2kprK1cBrS7au2ilAavEW74EoQx	1728494570973	client_2lqLHGcWhXm6cYRI2jNbelzr3HA	1725902570973	1726507370973	1725975601195	ended	1725975657731
sess_2lsjR3c1TcxhMn8nj8bzSDcqtiD	user_2kprK1cBrS7au2ilAavEW74EoQx	1728567666232	client_2lsjQKePX4A3nhGIjjAzpr0BZ3I	1725975666232	1726580466232	1725975666232	active	1725975666261
sess_2lskJ2ywO3jDUQ5M9CyRdwK585K	user_2kprK1cBrS7au2ilAavEW74EoQx	1728568095912	client_2lskHUzbi8aiy6VPynGCLPCm98t	1725976095912	1726580895912	1726004338990	ended	1726004339796
sess_2ltfezkjuS4c8XgOE6jzWQCGq6r	user_2kprK1cBrS7au2ilAavEW74EoQx	1728596392343	client_2ltfdt03p6J6pupkf6ov6uBt10U	1726004392343	1726609192343	1726004392343	active	1726004392388
sess_2nkk4VvXaBOM0TSchwfTRAyquYa	user_2kprK1cBrS7au2ilAavEW74EoQx	1732116270446	client_2nZShswvkqiz1VMwfJUGAMIfMn8	1729524270446	1730129070446	1729524270446	active	1729524270485
sess_2ltfsNWIwB16n3w6M9IM5gqW2Ed	user_2kprK1cBrS7au2ilAavEW74EoQx	1728596498269	client_2ltfqY8SZMSqk1XuJfo3v2yA4WK	1726004498269	1726609298269	1726018241154	ended	1726018243130
sess_2lu7n1YFLAXydubT56H0SRoEmkW	user_2kprK1cBrS7au2ilAavEW74EoQx	1728610270540	client_2lu7lvrQTsQuogMUkwwN3kagE0s	1726018270540	1726623070540	1726018270540	active	1726018270574
sess_2lvvwt2IEbGIsnYiO1wUrcPWIHM	user_2kprK1cBrS7au2ilAavEW74EoQx	1728665605246	client_2lvvwi8rEUq3yihSIbkMFHrfUwb	1726073605246	1726678405246	1726073605246	active	1726073605280
sess_2lvKGyEmOMtwYuKTJtyCvGVCpL4	user_2kprK1cBrS7au2ilAavEW74EoQx	1728647017483	client_2lvKFUhhC1WVn3TzNSYvaZ9jEmn	1726055017483	1726659817483	1726075189943	ended	1726075191990
sess_2lvzBEj7KpuMBYFjzA2SjF3zeCh	user_2kprK1cBrS7au2ilAavEW74EoQx	1728667200588	client_2lvzBBI6KfuPn2kIQ4v8SSt7gUL	1726075200588	1726680000588	1726143623657	ended	1726143625133
sess_2lyDz5jNYVbVQEwEphS9Jzf8ool	user_2kprK1cBrS7au2ilAavEW74EoQx	1728735681615	client_2lyDyyCaBfZHJPKei65qYCjdGBm	1726143681615	1726748481615	1726148457265	ended	1726148458865
sess_2lyNopK96dwfrKCCV5uYXi8EARW	user_2kprK1cBrS7au2ilAavEW74EoQx	1728740533782	client_2lyNop71XhTFgONi5vtBNMVOceS	1726148533782	1726753333782	1726150465371	ended	1726150466278
sess_2lyRl01djOt84C0q65kt7Cqptch	user_2kprK1cBrS7au2ilAavEW74EoQx	1728742476245	client_2lyRkrvZsC4NTFZfaZg4OYm2fx6	1726150476245	1726755276245	1726235674858	ended	1726236079840
sess_2m1FI1m442Xvt1ZWoKZ5Lfon43b	user_2kprK1cBrS7au2ilAavEW74EoQx	1728828091384	client_2m1FHN24XtVHaUQsrj0TSdp6ybu	1726236091384	1726840891384	1726236091384	active	1726236091449
sess_2m1IT488LIir3kFwxslL5O6jbwe	user_2kprK1cBrS7au2ilAavEW74EoQx	1728829659806	client_2m1IRdoHtUSUFjvXw2XallEvenK	1726237659806	1726842459806	1726491762571	ended	1726491767105
sess_2m9bauAzVb7vcesi1ehe5L1WrgY	user_2kprK1cBrS7au2ilAavEW74EoQx	1729083805116	client_2m9bY6B6IpEvKzBtvgAxBphYpMX	1726491805116	1727096605116	1726526553959	ended	1726526557308
sess_2mAk5cN8rPbnmBEghiEOuINmHLm	user_2kprK1cBrS7au2ilAavEW74EoQx	1729118585525	client_2mAk4W2niCaX7GFfJ8GARhHszz8	1726526585525	1727131385525	1726595533382	ended	1726595698370
sess_2mDJM0eJl30OnVUtO17plb5kdz2	user_2kprK1cBrS7au2ilAavEW74EoQx	1729197161261	client_2mDJLtjgYyXH8rClkYFWfUHNFcz	1726605161261	1727209961261	1726605161261	active	1726605161302
sess_2mI3pRK3M0oM8GCue7zaOWq9Upc	user_2kprK1cBrS7au2ilAavEW74EoQx	1729342445001	client_2mI3iMI2oT9Jt22HdxolvMppZ16	1726750445001	1727355245001	1727186657585	ended	1727186666252
sess_2mWK2PNNnp7eYLf6gQ3zIM4eMPV	user_2kprK1cBrS7au2ilAavEW74EoQx	1729778684938	client_2mWK0WzIJi7Zou0XclV4wbgxViQ	1727186684938	1727791484938	1727745883905	ended	1727745895589
sess_2mobXtC5glzWC69joZMUH1hzPEx	user_2kprK1cBrS7au2ilAavEW74EoQx	1730337918085	client_2mobXhWOzIGMJGHWXBedgWOgDlv	1727745918085	1728350718085	1727746350233	ended	1727746352002
sess_2mocQlL5K1Lp1lJkBaFFSejCycR	user_2kprK1cBrS7au2ilAavEW74EoQx	1730338355694	client_2mocQrEWhzWVSE6wBjVbq7wl5GR	1727746355694	1728351155694	1727790683617	ended	1727790685443
sess_2mq4IFsU4B7SoPGG3nJPqFM8lD2	user_2kprK1cBrS7au2ilAavEW74EoQx	1730382690944	client_2mq4IEOI8MWWtIEXYrgy3X8jg8g	1727790690944	1728395490944	1727790825208	ended	1727790831209
sess_2mq4aUwbmKxJ4s814MBEpVbYxpH	user_2kprK1cBrS7au2ilAavEW74EoQx	1730382835745	client_2mq4aTRmhMTV1j0T4ePlyThAuwJ	1727790835745	1728395635745	1727793309503	ended	1727793316190
sess_2mq9e9NSiLSuU1uu5TuRbCIBeUn	user_2kprK1cBrS7au2ilAavEW74EoQx	1730385331620	client_2mq9cxKKRgjPtLMd6N9o9ihETcg	1727793331620	1728398131620	1727800220505	ended	1727800225438
sess_2mqNdLQCn1ql5KDQgE4wMdeXARS	user_2kprK1cBrS7au2ilAavEW74EoQx	1730392232732	client_2mqNd8hOMOHC4utczWOVKvS1xzS	1727800232732	1728405032732	1727868964992	ended	1727869256443
sess_2msdeNJ2W9bEVLObsJOlmy1OvDe	user_2kprK1cBrS7au2ilAavEW74EoQx	1730461311680	client_2msdXuzupSL8liMEISwZVaQbyBs	1727869311680	1728474111680	1727869504209	ended	1727869506330
sess_2mse3kTURFmUJcYw3GHurb1uhBw	user_2kprK1cBrS7au2ilAavEW74EoQx	1730461513387	client_2mse2oxYGSBx11QqHmbZ8gveAiM	1727869513387	1728474313387	1727869513387	active	1727869513426
sess_2mseumphILh9wTvdXHx76HnWYqT	user_2kprK1cBrS7au2ilAavEW74EoQx	1730461935092	client_2msesoKYRoOeSwr6zGaST3E0Ozh	1727869935092	1728474735092	1728238194181	removed	1728239678677
sess_2n4kLq0uoTwsI1zswJNphu5cpkT	user_2kprK1cBrS7au2ilAavEW74EoQx	1730831682398	client_2msesoKYRoOeSwr6zGaST3E0Ozh	1728239682398	1728844482398	1728242746325	removed	1728242748251
sess_2n4qbUltnCQfsgMmOCIHXCfkVQm	user_2kprK1cBrS7au2ilAavEW74EoQx	1730834767592	client_2msesoKYRoOeSwr6zGaST3E0Ozh	1728242767592	1728847567592	1728248276517	removed	1728248277424
sess_2n51p9iJbL9VKmyJXpo6xs2nwkY	user_2kprK1cBrS7au2ilAavEW74EoQx	1730840302501	client_2msesoKYRoOeSwr6zGaST3E0Ozh	1728248302501	1728853102501	1728308262312	removed	1728308263232
sess_2n6zOSGA2cSvxiZVejgrDdEKhKn	user_2kprK1cBrS7au2ilAavEW74EoQx	1730900280350	client_2msesoKYRoOeSwr6zGaST3E0Ozh	1728308280350	1728913080350	1728324892922	removed	1728325020140
sess_2n7XNLBhMvGr2JfjmxJVAaZkgva	user_2kprK1cBrS7au2ilAavEW74EoQx	1730917046595	client_2msesoKYRoOeSwr6zGaST3E0Ozh	1728325046596	1728929846595	1728325046595	active	1728325046640
sess_2n7YDBnqB3XvVD7jEoNuisAEWWw	user_2kprK1cBrS7au2ilAavEW74EoQx	1730917459271	client_2n7Y4KvFWbwnD1BkxJxcqJk8M56	1728325459271	1728930259271	1728326599206	removed	1728327791435
sess_2n7cwjAJscU962c8uEIQJs90ZDV	user_2kprK1cBrS7au2ilAavEW74EoQx	1730919794814	client_2n7Y4KvFWbwnD1BkxJxcqJk8M56	1728327794814	1728932594814	1728395739095	removed	1728395744844
sess_2nAxRB8PZEwHGsf7V6aLXR1vK0Q	user_2kprK1cBrS7au2ilAavEW74EoQx	1731021670587	client_2nApmAgZ7LvFkxrmqOqER6H1XBc	1728429670587	1729034470587	1728429670587	active	1728429670630
sess_2nRCHWpN8GkpI6SXUF6QZ5bNKNe	user_2kprK1cBrS7au2ilAavEW74EoQx	1731518413151	client_2nOxLJgU6L7yExOTzTSOWjxprwd	1728926413152	1729531213151	1729005180977	removed	1729005251135
sess_2nTm79nrkiAN2y7TdlhETZ0YPsG	user_2kprK1cBrS7au2ilAavEW74EoQx	1731597269080	client_2nOxLJgU6L7yExOTzTSOWjxprwd	1729005269080	1729610069080	1729008983086	removed	1729009025360
sess_2nTtnS1tXon6iITH5725ALEVI4F	user_2kprK1cBrS7au2ilAavEW74EoQx	1731601059711	client_2nOxLJgU6L7yExOTzTSOWjxprwd	1729009059711	1729613859711	1729009059711	active	1729009059747
sess_2nX6LVcCyosu9lYScwbAafNYlrH	user_2kprK1cBrS7au2ilAavEW74EoQx	1731699017453	client_2nUITuvxFPoyU0HoSJMhyyF5Wz4	1729107017453	1729711817453	1729127679096	removed	1729127938414
sess_2nXmkwPfg75qWTi9RS4qCvhWuNW	user_2kprK1cBrS7au2ilAavEW74EoQx	1731719941512	client_2nUITuvxFPoyU0HoSJMhyyF5Wz4	1729127941512	1729732741512	1729178475366	removed	1729178479287
sess_2nkmCd0mN9xVSIWTchMSHVTL0K6	user_2kprK1cBrS7au2ilAavEW74EoQx	1732117321598	client_2nkm7fiNaCDTvvpewwYDid1ihDn	1729525321598	1730130121598	1729525321598	active	1729525321674
sess_2nq27yzuVksKrIuxJZZnFa5JQ62	user_2kprK1cBrS7au2ilAavEW74EoQx	1732278121528	client_2nl4YMBNfqKhHl9ob2ILgHhdnri	1729686121528	1730290921528	1729686121528	active	1729686121562
sess_2nqwqSRg6DAUkDtZYLuXJH2AAQ1	user_2kprK1cBrS7au2ilAavEW74EoQx	1732306104570	client_2nqwnQISBlB4M76UZpLaApvu3Ll	1729714104572	1730318904570	1729772358367	removed	1729772410577
\.


--
-- Data for Name: TierFeatureLimit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."TierFeatureLimit" ("id", "createLimit", "updateLimit", "deleteLimit", "feature_id", "product_id") FROM stdin;
clzxc2lcf001blibvpo2hbbyr	30	30	30	clzwt0hb90002i6oukl8cpy03	prod_QfmmFkzIUNh99w
clzxc2le3001dlibvd7h6j58m	3	3	3	clzwt0hba000pi6ouuc4i86sl	prod_QfmmFkzIUNh99w
clzxc2lfs001flibv96z2wqky	40	40	40	clzwt0hb90008i6ouprc1z3c4	prod_QfmmFkzIUNh99w
clzxc2lhf001hlibva31ms91p	10	10	10	clzwt0hb90005i6ouf1ddivig	prod_QfmmFkzIUNh99w
clzxc2lj9001jlibvctkn8oa2	40	40	40	clzwt0hba000oi6ou2lwb82sf	prod_QfmmFkzIUNh99w
clzxc2lkv001llibvmhp3dcyd	60	60	60	clzwt0hba000ni6ouv5bc7n3c	prod_QfmmFkzIUNh99w
clzxc2lmp001nlibvh3gu4nro	4	4	5	clzwt0hb90006i6ou41xvmrul	prod_QfmmFkzIUNh99w
clzxc2lok001plibvoqnh55se	9	9	9	clzwt0hb90003i6ouyhy1jm5s	prod_QfmmFkzIUNh99w
clzxc2lq9001rlibvdgmfo0q9	10	10	10	clzwt0hb90001i6ouehex626n	prod_QfmmFkzIUNh99w
clzxc2ls2001tlibv8zhm1bos	50	50	50	clzwt0hb90007i6ou7rw9oje1	prod_QfmmFkzIUNh99w
clzxc2lts001vlibvhl533slr	20	20	20	clzwt0hb9000ei6ouxeu2hchk	prod_QfmmFkzIUNh99w
clzxc2lvg001xlibvjsleqerb	6	6	6	clzwt0hba000gi6ou3g8sjsa7	prod_QfmmFkzIUNh99w
clzxc2lx3001zlibv8v8k4llw	3	3	3	clzwt0hb9000ci6ou1gjwhltr	prod_QfmmFkzIUNh99w
clzxc2lyn0021libvnet157w4	2	2	2	clzwt0hb9000ai6ouzl77hk0w	prod_QfmmFkzIUNh99w
clzxc2m0f0023libvu7im7fm0	2	2	2	clzwt0hb9000bi6ou2q4f118d	prod_QfmmFkzIUNh99w
clzxc2m260025libvvhcwycub	3	3	3	clzwt0hb90004i6ouoodtwuv7	prod_QfmmFkzIUNh99w
clzxc2m3w0027libvhlxm7kqn	10	10	5	clzwt0hba000hi6ousvfd9wyc	prod_QfmmFkzIUNh99w
clzxc2m5i0029libv7hn4bi4o	10	10	5	clzwt0hba000ii6ou9it01909	prod_QfmmFkzIUNh99w
clzxc2m7b002blibvecxcucr7	20	20	20	clzwt0hba000fi6ouqcct3hmr	prod_QfmmFkzIUNh99w
clzxc2m8z002dlibvc4jmjdhg	10	10	10	clzwt0hba000ji6ou0dvrb03u	prod_QfmmFkzIUNh99w
clzxc2mb1002flibvt8sgqnvi	10	10	10	clzwt0hba000ki6oudwc6rmdo	prod_QfmmFkzIUNh99w
clzxc2md4002hlibvipci2kzu	3	3	3	clzwt0hb90009i6ougttx8nrz	prod_QfmmFkzIUNh99w
clzxc2mev002jlibv34yyynk7	20	20	20	clzwt0hb9000di6oux6zmk5zj	prod_QfmmFkzIUNh99w
clzxc2rs7002llibvsxqvhysk	10	10	10	clzwt0hba000pi6ouuc4i86sl	prod_Qfmn4tshwQDaDG
clzxc2ru5002nlibv697g4ipz	60	60	60	clzwt0hb90002i6oukl8cpy03	prod_Qfmn4tshwQDaDG
clzxc2rvw002plibvjat4kzs0	120	120	120	clzwt0hb90008i6ouprc1z3c4	prod_Qfmn4tshwQDaDG
clzxc2s07002rlibvovmfgzvd	30	30	30	clzwt0hb90001i6ouehex626n	prod_Qfmn4tshwQDaDG
clzxc2s1w002tlibvm3kzq6dm	30	30	30	clzwt0hb90005i6ouf1ddivig	prod_Qfmn4tshwQDaDG
clzxc2s3h002vlibv1gdhewyd	20	20	20	clzwt0hb90003i6ouyhy1jm5s	prod_Qfmn4tshwQDaDG
clzxc2s5m002xlibv9c4mrtdz	15	15	15	clzwt0hb90006i6ou41xvmrul	prod_Qfmn4tshwQDaDG
clzxc2s7h002zlibvlyl6rbu4	6	6	6	clzwt0hb90009i6ougttx8nrz	prod_Qfmn4tshwQDaDG
clzxc2s9b0031libva4vzywhd	10	10	10	clzwt0hb90004i6ouoodtwuv7	prod_Qfmn4tshwQDaDG
clzxc2sb20033libvjkgjupqi	180	180	180	clzwt0hba000ni6ouv5bc7n3c	prod_Qfmn4tshwQDaDG
clzxc2scw0035libvtiquo4zw	150	150	150	clzwt0hb90007i6ou7rw9oje1	prod_Qfmn4tshwQDaDG
clzxc2sep0037libvi2oslnyo	12	12	12	clzwt0hba000gi6ou3g8sjsa7	prod_Qfmn4tshwQDaDG
clzxc2sg80039libvn7v6omcv	40	40	40	clzwt0hba000fi6ouqcct3hmr	prod_Qfmn4tshwQDaDG
clzxc2shx003blibv82t55g4i	40	40	40	clzwt0hb9000ei6ouxeu2hchk	prod_Qfmn4tshwQDaDG
clzxc2sjl003dlibvei1mc0vb	40	40	40	clzwt0hb9000di6oux6zmk5zj	prod_Qfmn4tshwQDaDG
clzxc2sld003flibvptj2o28f	12	12	12	clzwt0hb9000ci6ou1gjwhltr	prod_Qfmn4tshwQDaDG
clzxc2sn5003hlibvvg505903	6	6	6	clzwt0hb9000ai6ouzl77hk0w	prod_Qfmn4tshwQDaDG
clzxc2sot003jlibvh8wp2gmh	6	6	6	clzwt0hb9000bi6ou2q4f118d	prod_Qfmn4tshwQDaDG
clzxc2sqh003llibvygsjut3j	10	10	10	clzwt0hba000hi6ousvfd9wyc	prod_Qfmn4tshwQDaDG
clzxc2ss4003nlibvz9ncpqmg	20	20	20	clzwt0hba000ji6ou0dvrb03u	prod_Qfmn4tshwQDaDG
clzxc2stu003plibvxhfedxn1	20	20	20	clzwt0hba000ki6oudwc6rmdo	prod_Qfmn4tshwQDaDG
clzxc2svs003rlibvomt9wdpg	10	10	10	clzwt0hba000ii6ou9it01909	prod_Qfmn4tshwQDaDG
clzxbnjoa0005libvddzzbuyi	10000	10000	10000	clzwt0hb90008i6ouprc1z3c4	prod_QfmorrgXFyWRmN
clzxbnjmk0003libv77izyscx	10000	10000	10000	clzwt0hb90002i6oukl8cpy03	prod_QfmorrgXFyWRmN
clzxbnjq50007libvhnpawf12	10000	10000	10000	clzwt0hba000ni6ouv5bc7n3c	prod_QfmorrgXFyWRmN
clzxbnk3y000llibv22pp0miq	10000	10000	10000	clzwt0hba000gi6ou3g8sjsa7	prod_QfmorrgXFyWRmN
clzxbnjrt0009libvdy1ry8zd	10000	10000	10000	clzwt0hba000oi6ou2lwb82sf	prod_QfmorrgXFyWRmN
clzxbnjwf000dlibvqa13ovmc	10000	10000	10000	clzwt0hb90001i6ouehex626n	prod_QfmorrgXFyWRmN
clzxbnknl0017libv3inqydc8	10000	10000	10000	clzwt0hb90004i6ouoodtwuv7	prod_QfmorrgXFyWRmN
clzxbnkk90013libv6mizp0vr	10000	10000	10000	clzwt0hb90003i6ouyhy1jm5s	prod_QfmorrgXFyWRmN
clzxbnjui000blibvmlzrub0c	10000	10000	10000	clzwt0hb90005i6ouf1ddivig	prod_QfmorrgXFyWRmN
clzxbnkax000tlibvb6zzzutc	10000	10000	10000	clzwt0hb9000ai6ouzl77hk0w	prod_QfmorrgXFyWRmN
clzxbnjy4000flibvnzroyaw6	10000	10000	10000	clzwt0hb90006i6ou41xvmrul	prod_QfmorrgXFyWRmN
clzxbnkck000vlibv1j3lxj4w	10000	10000	10000	clzwt0hb9000bi6ou2q4f118d	prod_QfmorrgXFyWRmN
clzxbnk95000rlibv5s1xvsr8	10000	10000	10000	clzwt0hb9000ci6ou1gjwhltr	prod_QfmorrgXFyWRmN
clzxbnk5q000nlibvvpfqz1e5	10000	10000	10000	clzwt0hba000fi6ouqcct3hmr	prod_QfmorrgXFyWRmN
clzxbnklz0015libvyy9qyfrd	10000	10000	10000	clzwt0hb9000di6oux6zmk5zj	prod_QfmorrgXFyWRmN
clzxbnk7h000plibvwzkfik2m	10000	10000	10000	clzwt0hb9000ei6ouxeu2hchk	prod_QfmorrgXFyWRmN
clzxbnk0b000hlibvgvqi5e4l	10000	10000	10000	clzwt0hb90009i6ougttx8nrz	prod_QfmorrgXFyWRmN
clzxbnk23000jlibv3293pr7r	10000	10000	10000	clzwt0hb90007i6ou7rw9oje1	prod_QfmorrgXFyWRmN
clzxbnkg5000zlibvirgsct5r	10000	10000	10000	clzwt0hba000ii6ou9it01909	prod_QfmorrgXFyWRmN
clzxbnkih0011libv8qsq50yj	10000	10000	10000	clzwt0hba000ki6oudwc6rmdo	prod_QfmorrgXFyWRmN
clzxbnkee000xlibvvjioacqj	10000	10000	10000	clzwt0hba000ji6ou0dvrb03u	prod_QfmorrgXFyWRmN
cm29blljx0001tnii027uyog2	10000	10000	10000	clzwt0hb90000i6ouz3k5z64f	prod_QfmorrgXFyWRmN
clzxbnkpd0019libv8pcs271d	10000	10000	10000	clzwt0hba000hi6ousvfd9wyc	prod_QfmorrgXFyWRmN
clzxbnjkq0001libv4dqbxcy4	10000	10000	10000	clzwt0hba000pi6ouuc4i86sl	prod_QfmorrgXFyWRmN
\.


--
-- Data for Name: TierLimit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."TierLimit" ("id", "productId", "featureId", "subscriptionId", "createLimit", "updateLimit", "createUsage", "updateUsage", "deleteLimit", "deleteUsage") FROM stdin;
clzxd0gmd000ktjoiq5ctosq1	prod_Qfmn4tshwQDaDG	clzwt0hb90006i6ou41xvmrul	clzxd0f7n0000tjoin9onzoaz	15	15	0	0	15	0
cm074ijvo0009d2sn6b30c3b5	prod_QfmorrgXFyWRmN	clzwt0hb90008i6ouprc1z3c4	cm074ijbi0002d2snexcsz5tw	10000	10000	4	1	10000	2
cm074ijvo000bd2snrotcmiss	prod_QfmorrgXFyWRmN	clzwt0hba000ni6ouv5bc7n3c	cm074ijbi0002d2snexcsz5tw	10000	10000	35	27	10000	36
cm074ijvn0005d2sn8ujgi2cc	prod_QfmorrgXFyWRmN	clzwt0hba000pi6ouuc4i86sl	cm074ijbi0002d2snexcsz5tw	10000	10000	5	1	10000	4
cm074ijvp000ld2sn7c0yrbc9	prod_QfmorrgXFyWRmN	clzwt0hb90009i6ougttx8nrz	cm074ijbi0002d2snexcsz5tw	10000	10000	0	15	10000	0
cm074ijvo0007d2snd6qgdho5	prod_QfmorrgXFyWRmN	clzwt0hb90002i6oukl8cpy03	cm074ijbi0002d2snexcsz5tw	10000	10000	2	1	10000	1
cm074ijvo000fd2snk2567oa6	prod_QfmorrgXFyWRmN	clzwt0hb90005i6ouf1ddivig	cm074ijbi0002d2snexcsz5tw	10000	10000	13	1	10000	4
cm074ijvo000dd2snfmykclrr	prod_QfmorrgXFyWRmN	clzwt0hba000oi6ou2lwb82sf	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvp000hd2sn4fgjh9tk	prod_QfmorrgXFyWRmN	clzwt0hb90001i6ouehex626n	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvp000jd2sn6qdwefa4	prod_QfmorrgXFyWRmN	clzwt0hb90006i6ou41xvmrul	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
clzxd0gme000mtjoilukth548	prod_Qfmn4tshwQDaDG	clzwt0hb90009i6ougttx8nrz	clzxd0f7n0000tjoin9onzoaz	6	6	0	0	6	0
clzxd0gme000otjoiy1pcb5rz	prod_Qfmn4tshwQDaDG	clzwt0hb90004i6ouoodtwuv7	clzxd0f7n0000tjoin9onzoaz	10	10	0	0	10	0
clzxd0gme000qtjoihtkrfjbi	prod_Qfmn4tshwQDaDG	clzwt0hba000ni6ouv5bc7n3c	clzxd0f7n0000tjoin9onzoaz	180	180	0	0	180	0
clzxd0gme000stjoif4xge4d7	prod_Qfmn4tshwQDaDG	clzwt0hb90007i6ou7rw9oje1	clzxd0f7n0000tjoin9onzoaz	150	150	0	0	150	0
clzxd0gmf000utjoiuys8i641	prod_Qfmn4tshwQDaDG	clzwt0hba000gi6ou3g8sjsa7	clzxd0f7n0000tjoin9onzoaz	12	12	5	0	12	7
clzxd0gmf000wtjoi0jxuedej	prod_Qfmn4tshwQDaDG	clzwt0hba000fi6ouqcct3hmr	clzxd0f7n0000tjoin9onzoaz	40	40	0	0	40	0
clzxd0gm90008tjoi6ee6ovtf	prod_Qfmn4tshwQDaDG	clzwt0hba000pi6ouuc4i86sl	clzxd0f7n0000tjoin9onzoaz	10	10	0	2	10	0
clzxd0gma000atjoi1gii0hs2	prod_Qfmn4tshwQDaDG	clzwt0hb90002i6oukl8cpy03	clzxd0f7n0000tjoin9onzoaz	60	60	0	0	60	0
clzxd0gma000ctjoi0d8ki68h	prod_Qfmn4tshwQDaDG	clzwt0hb90008i6ouprc1z3c4	clzxd0f7n0000tjoin9onzoaz	120	120	0	0	120	0
clzxd0gmb000etjoiskw1eodf	prod_Qfmn4tshwQDaDG	clzwt0hb90001i6ouehex626n	clzxd0f7n0000tjoin9onzoaz	30	30	0	0	30	0
clzxd0gmc000gtjoiwxupjvyu	prod_Qfmn4tshwQDaDG	clzwt0hb90005i6ouf1ddivig	clzxd0f7n0000tjoin9onzoaz	30	30	2	0	30	0
clzxd0gmd000itjoiri5sljjg	prod_Qfmn4tshwQDaDG	clzwt0hb90003i6ouyhy1jm5s	clzxd0f7n0000tjoin9onzoaz	20	20	0	0	20	0
clzxd0gmf000ytjoi6c99krla	prod_Qfmn4tshwQDaDG	clzwt0hb9000ei6ouxeu2hchk	clzxd0f7n0000tjoin9onzoaz	40	40	0	0	40	0
clzxd0gmf0010tjoielzew9yt	prod_Qfmn4tshwQDaDG	clzwt0hb9000di6oux6zmk5zj	clzxd0f7n0000tjoin9onzoaz	40	40	0	0	40	0
clzxd0gmf0012tjoite18z7uw	prod_Qfmn4tshwQDaDG	clzwt0hb9000ci6ou1gjwhltr	clzxd0f7n0000tjoin9onzoaz	12	12	0	0	12	1
clzxd0gmf0014tjoi131hovzp	prod_Qfmn4tshwQDaDG	clzwt0hb9000ai6ouzl77hk0w	clzxd0f7n0000tjoin9onzoaz	6	6	0	0	6	0
clzxd0gmg0016tjoi3ms0i3ow	prod_Qfmn4tshwQDaDG	clzwt0hb9000bi6ou2q4f118d	clzxd0f7n0000tjoin9onzoaz	6	6	0	0	6	0
cm074ijvp000rd2snak9mi85u	prod_QfmorrgXFyWRmN	clzwt0hba000fi6ouqcct3hmr	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm22mlfoj0000p89rr4s0ymil	prod_QfmorrgXFyWRmN	clzwt0hba000mi6ouzjdtptce	cm074ijbi0002d2snexcsz5tw	1000	1000	22	5	1000	5
cm074ijvp000pd2sn92sapkzl	prod_QfmorrgXFyWRmN	clzwt0hba000gi6ou3g8sjsa7	cm074ijbi0002d2snexcsz5tw	10000	10000	156	34	10000	163
cm074ijvq000xd2sn22teh291	prod_QfmorrgXFyWRmN	clzwt0hb9000ai6ouzl77hk0w	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvq000zd2snas6acfp1	prod_QfmorrgXFyWRmN	clzwt0hb9000bi6ou2q4f118d	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvq0011d2sn6tjmlxks	prod_QfmorrgXFyWRmN	clzwt0hba000ji6ou0dvrb03u	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvr0017d2snl6i2e5us	prod_QfmorrgXFyWRmN	clzwt0hb90003i6ouyhy1jm5s	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvr001bd2snk3j8hy97	prod_QfmorrgXFyWRmN	clzwt0hb90004i6ouoodtwuv7	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvr001dd2sniybc1bki	prod_QfmorrgXFyWRmN	clzwt0hba000hi6ousvfd9wyc	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	0
cm074ijvr0015d2sn9nyhw2o1	prod_QfmorrgXFyWRmN	clzwt0hba000ki6oudwc6rmdo	cm074ijbi0002d2snexcsz5tw	10000	10000	5	1	10000	0
cm29bkfft0000tniidqijourt	prod_QfmorrgXFyWRmN	clzwt0hb90000i6ouz3k5z64f	cm074ijbi0002d2snexcsz5tw	1000	1000	108	0	1000	154
cm074ijvq000vd2sn4mgpmkaz	prod_QfmorrgXFyWRmN	clzwt0hb9000ci6ou1gjwhltr	cm074ijbi0002d2snexcsz5tw	10000	10000	22	10	10000	23
cm074ijvr0019d2snfe6a27gr	prod_QfmorrgXFyWRmN	clzwt0hb9000di6oux6zmk5zj	cm074ijbi0002d2snexcsz5tw	10000	10000	2	7	10000	3
cm074ijvp000td2snxycj2mkl	prod_QfmorrgXFyWRmN	clzwt0hb9000ei6ouxeu2hchk	cm074ijbi0002d2snexcsz5tw	10000	10000	2	3	10000	5
cm074ijvq0013d2snq0vdqkij	prod_QfmorrgXFyWRmN	clzwt0hba000ii6ou9it01909	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	86
clzxd0gmg0018tjoiejadutft	prod_Qfmn4tshwQDaDG	clzwt0hba000hi6ousvfd9wyc	clzxd0f7n0000tjoin9onzoaz	10	10	0	0	10	1
clzxd0gmg001atjoi8tqic8k0	prod_Qfmn4tshwQDaDG	clzwt0hba000ji6ou0dvrb03u	clzxd0f7n0000tjoin9onzoaz	20	20	0	0	20	0
clzxd0gmg001ctjoi58uif310	prod_Qfmn4tshwQDaDG	clzwt0hba000ki6oudwc6rmdo	clzxd0f7n0000tjoin9onzoaz	20	20	0	0	20	0
clzxd0gmg001etjoiaa2mocp4	prod_Qfmn4tshwQDaDG	clzwt0hba000ii6ou9it01909	clzxd0f7n0000tjoin9onzoaz	10	10	0	0	10	0
cm074ijvp000nd2snmj9n4a7q	prod_QfmorrgXFyWRmN	clzwt0hb90007i6ou7rw9oje1	cm074ijbi0002d2snexcsz5tw	10000	10000	0	0	10000	20
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") FROM stdin;
f8c3b81f-d4b4-4d38-94d0-9f0dc810c443	37d2dfb4432d85f396a771f740aacce80d86b426e474c1f21f1e2136997a7617	2024-08-16 14:04:26.558034+00	20230902002803_feature_limits	\N	\N	2024-08-16 14:04:26.447047+00	1
afb55108-4816-4793-8f47-b67f447d281d	e0ed00bbde8e15ef3927713b710aa44843e6140849c5cf881725ecee8f704a3b	2024-08-16 14:04:23.220433+00	0_init	\N	\N	2024-08-16 14:04:23.004088+00	1
bc931615-c4cb-455d-9c1a-521b900300a5	f4ffc15eb56d3ae979c0a1ef247b2b163e7e1bed172f6361e2e7595621488e0e	2024-08-16 14:04:24.894643+00	20230522230447_	\N	\N	2024-08-16 14:04:24.803794+00	1
d5db22fe-4cdb-4235-83e4-21a20838e63e	62c91d445d2586411efc739746cb8405d74b182d4b66119f4dd3b65ecea8ade7	2024-08-16 14:04:23.330478+00	20230508135144_	\N	\N	2024-08-16 14:04:23.251391+00	1
24355b56-8da2-4124-9f06-a281e3376f46	98153af861fc134248492cf6557ecd74f09765059ff1f91cfce9905e32724d99	2024-08-16 14:04:23.458829+00	20230512013329_checkout_session_2	\N	\N	2024-08-16 14:04:23.363719+00	1
5841b573-7dcf-4e5a-ab19-454230dbea08	633881413cc963c94b6ee02fcd99a4b3529aa025adb226107c974f9190150225	2024-08-16 14:04:25.914627+00	20230614153801_gtm_setting_unique_user_id	\N	\N	2024-08-16 14:04:25.837593+00	1
403f1f9e-85f3-4174-ab32-5185264c0820	32e71d081266a04260f20492a7181d2e974007de3e80278e8801a70e3ccb6e56	2024-08-16 14:04:23.562945+00	20230512222310_sub_product	\N	\N	2024-08-16 14:04:23.483098+00	1
64028212-e205-4ffe-9c4e-7a3307498bfb	c4d44e4a4648a7befbf32884506234d7da5585175dd2986e73c2f010449b9212	2024-08-16 14:04:25.015504+00	20230523011621_	\N	\N	2024-08-16 14:04:24.927589+00	1
81b516dd-5f10-4389-ada4-d6fc7f8cc22c	00599cd4b403ea9904677194d6bd3df4d9b03cffa889e40ec0dfa6b608baf231	2024-08-16 14:04:23.683224+00	20230513163719_	\N	\N	2024-08-16 14:04:23.59128+00	1
ebdb4f9b-693e-46ba-9df1-30f392d81510	d3706b4ad8e6aeac3181975a3e7cf86698bdfe9c470ff4b9559fafe25b3beab2	2024-08-16 14:04:23.807045+00	20230515154213_invoice	\N	\N	2024-08-16 14:04:23.717527+00	1
51371349-84b3-4a79-a659-4da18a22a869	13f5a73624c4237047c9cb79c8aad8d2155146559024e1aa94a97cf895093624	2024-08-16 14:04:23.906515+00	20230515155008_invoice_amt_due	\N	\N	2024-08-16 14:04:23.839889+00	1
cd1f29d0-9a4a-43ca-9db8-bcfcf23d0916	b192e5c6cc51d1ab991f9370b9970aae8981206a5c0f394b7dd85b161a18a0e4	2024-08-16 14:04:25.138271+00	20230523175325_refactor_invoice	\N	\N	2024-08-16 14:04:25.042362+00	1
33b1e6a1-e6d8-4ac8-8602-7a796dc24e43	40f087215d679953b732acd536fa57e8b86bcfb0a71e73ceccccd46b8d452208	2024-08-16 14:04:24.053659+00	20230515160652_inv_refactor	\N	\N	2024-08-16 14:04:23.931635+00	1
2ba14ec6-107c-4234-a42d-d8dd951bd3e4	96edfcad219c004435c5d0efef8e0d9c546ba946b2c42e6bacc66d03846a22f4	2024-08-16 14:04:24.158224+00	20230515162342_due_date	\N	\N	2024-08-16 14:04:24.083296+00	1
ecbfaf81-8715-4902-b8a9-2e1d0a45b9ca	8070137e33ba5ff6da2c1846cf4c84eeb3d119595d784554412946d2cb52a55d	2024-08-16 14:04:24.291623+00	20230516173001_sub_update_id	\N	\N	2024-08-16 14:04:24.187982+00	1
8ec3d5f1-6669-475f-b7e3-de3c3951b170	4092d1f4046bff27bb621955cfab20a546c59d1ceadc4fc7ffad3315c0c6d093	2024-08-16 14:04:25.233732+00	20230528212945_role_user	\N	\N	2024-08-16 14:04:25.16265+00	1
f8ccc91c-a65a-4a70-b60d-23b52fdcd3b4	bac743c7b09e689deac925de959ac18eda771a78eac0577f3e1a608c94f9afdd	2024-08-16 14:04:24.420672+00	20230516173252_remove_sub_id	\N	\N	2024-08-16 14:04:24.328418+00	1
b1cbff81-3ea4-4cb7-adfc-098f80464022	a095b7f858925464866f6e9e84e09ebae7d9065bfb2151c5089e040a298f951d	2024-08-16 14:04:24.542673+00	20230518155251_invoice	\N	\N	2024-08-16 14:04:24.446779+00	1
d3244c85-468b-4420-8f1c-d03b7d3a2886	4b8dfbbbba44eaa37cd13a820d31faca109e7dfd06f77a46b7d8898fda9099c7	2024-08-16 14:04:26.034416+00	20230614155205_rename_gtm_setting	\N	\N	2024-08-16 14:04:25.941379+00	1
c0339e9a-2e61-4faa-b8f1-ded903c6ff3a	449911e92b512d689a87732881826eb6f00fa9dded4b3aa88ef7370de1b8f27c	2024-08-16 14:04:24.659813+00	20230522173644_init	\N	\N	2024-08-16 14:04:24.573083+00	1
45023a2b-e352-4187-9697-c447ac027a1f	d8d4d45aaf98b89a063923a70e9102e141c0466a0ec7a9d7b800cdcd4a22e152	2024-08-16 14:04:25.339366+00	20230602141755_roles	\N	\N	2024-08-16 14:04:25.257885+00	1
2ab1c09e-1a21-4a65-99c2-040b29eecd38	672c56d7bda14bf778fc989f36e829efbebaae55b4a8dad11724ec8698c8149e	2024-08-16 14:04:24.774905+00	20230522193206_invoice_id_mapping	\N	\N	2024-08-16 14:04:24.693892+00	1
8e94829c-25ee-49cc-b357-46b0fe2ba4a3	d9d61e1d36db971b83b0dceb5709c6ba1c804ed4bcbcc03c929307c84840bdca	2024-08-16 14:04:25.443376+00	20230602145330_	\N	\N	2024-08-16 14:04:25.369173+00	1
0a40c911-c372-46c2-a4e5-51935cc5f8c2	7cb750c18846be0c5ac7c38d0740d76347a7ef742f9e8ed2a8d9dfac22eebf77	2024-08-16 14:04:27.270927+00	20230906132525_	\N	\N	2024-08-16 14:04:27.183388+00	1
b94413cc-6168-48df-bfc0-de8b658ac0b2	e73e704be6006c55f870a95fef58bf5b359e1f0c291ac33c98ce9489150bbe70	2024-08-16 14:04:25.558463+00	20230607171137_	\N	\N	2024-08-16 14:04:25.479252+00	1
016a313b-4675-44f8-b5de-6027147326e4	cefbf2d038fe58b1db9c2732c780605187a365a8226ea3b136236cff5d30151b	2024-08-16 14:04:26.150785+00	20230614155502_gtmsetting_refactor	\N	\N	2024-08-16 14:04:26.070584+00	1
9dac544b-fc55-419f-a6cb-22198bfcb7df	d6d3dc4d58d0ea18460d58cc3852b883e7af18b8e9a4d6c9469f42e1aa8cc109	2024-08-16 14:04:25.695619+00	20230613173612_product_access	\N	\N	2024-08-16 14:04:25.591989+00	1
c6435034-c417-444f-a552-fcbe72b23f3b	07321d54fc771e8af5236aeef6b71254a16cf60c9ea5197c91578d70af73d23d	2024-08-16 14:04:25.814082+00	20230614131505_gtm_setting	\N	\N	2024-08-16 14:04:25.726788+00	1
ba706dfa-f845-4606-a9b8-3fff4730bd46	65d6817a8365859275b316596020921337e798f5d59abf18128091366db9bd22	2024-08-16 14:04:26.666943+00	20230904180641_limit_feature_col	\N	\N	2024-08-16 14:04:26.584036+00	1
0339b8c0-e6af-44b9-b96d-d7f94ab36215	9dae225fa56b4c660f6cf7bb713a2a527e558e4b195cf1e0c1a34267587d33a9	2024-08-16 14:04:26.278305+00	20230614163405_gtm	\N	\N	2024-08-16 14:04:26.182411+00	1
f941595d-068e-4bf6-8b33-90fc59d712d0	c381104e89258578323d70bf767221075e467b6560802277796765d748ba84df	2024-08-16 14:04:26.410693+00	20230614172301_	\N	\N	2024-08-16 14:04:26.311695+00	1
aa7c8dc8-c046-4a8d-a8a7-9e27711ad105	f1503195a11c3e8480253c485409cbd38daa7e8c454633ee14f7fdad1bcc70c5	2024-08-16 14:04:27.034227+00	20230905152523_tier_limit_composite	\N	\N	2024-08-16 14:04:26.946664+00	1
e0dab551-0845-4254-ad39-eedd2186ad90	1ec3997a8ee05799abd2965a01d429d0beb58902c615b47199141b48bfe89012	2024-08-16 14:04:26.820075+00	20230904182754_	\N	\N	2024-08-16 14:04:26.700951+00	1
39ccd8db-8480-41f8-bb40-395e3270de02	f5349a3fab696247120c5d3c9de1419d350cb044d91e8f4a1bba74ff3fb2dcba	2024-08-16 14:04:26.918645+00	20230904185347_usage_tier	\N	\N	2024-08-16 14:04:26.846883+00	1
2e14a96e-8151-4af4-a55b-703c21e7e773	7f9ee04afbb0e762704ca23f4fe786aa5a15ac9b2d30fbd56c56f29c8e7b306d	2024-08-16 14:04:27.154756+00	20230906130938_create_update_limit_tiers	\N	\N	2024-08-16 14:04:27.063332+00	1
bd68c2f6-5097-4ec8-9f2f-bfb71948b0c0	29e3508d92760794204613b287b5fa4f469356f92cbd5a71e03cb80a7e3b0913	2024-08-16 14:04:27.486005+00	20231013005450_unique_gtm_entries	\N	\N	2024-08-16 14:04:27.411747+00	1
f8f102c0-e5d0-4e59-be33-d4476a0a1c33	46c3d7a7b204ab9f3352db26cc7133c7f4b4f8ab76440d1bfcf0385c6bc58da7	2024-08-16 14:04:27.379198+00	20230906191217_delete_feature_tiers	\N	\N	2024-08-16 14:04:27.30311+00	1
bd31e907-5972-405a-adfe-419f4c9e3c74	d0e3208ecd3d0ae212fee525d1798622fbcce9392f17a7d9e061b5c2ecce3530	2024-08-16 14:04:27.74951+00	20231116174147_clerk	\N	\N	2024-08-16 14:04:27.511259+00	1
fbdb8501-24df-43ab-a944-2cba3bd8cffd	54d059592f83ee4e4a74e4757e2c819f05a44de5fff4f3903d7596bcf8ba5d82	2024-08-16 14:04:27.868523+00	20231119160800_remove_uuid	\N	\N	2024-08-16 14:04:27.782588+00	1
1c3d2576-665e-4de2-afb1-adb1ebb026be	5197d4f2d3ade200faeaacaae543716de53e268bb26fba514319fc1559de8a02	2024-08-16 14:04:27.97874+00	20231119164332_del_verification_table	\N	\N	2024-08-16 14:04:27.904475+00	1
1b3c8ed7-274c-4641-93bd-be822e4568f5	23ffd328fa3596625f4132fb683f872459a7e75ed5100c4c5d8225e4091edf2c	2024-08-16 14:04:28.086066+00	20231119202719_session_clerk	\N	\N	2024-08-16 14:04:28.007149+00	1
3c153a78-611b-430d-b302-10ec02ead19d	d9aa7270669a43a020f14c27088d8a68adbc930e7057e454f37b004360580f52	2024-08-16 14:04:28.211477+00	20231119203414_session_int	\N	\N	2024-08-16 14:04:28.115971+00	1
0ac49af9-9731-45ae-bbac-c62cf3d3f6e6	8da31e5813cbc22b3d95c2526653755024b92e36502c59c5d289b94356cb46f3	2024-08-16 14:04:28.31521+00	20231119203744_remove_session_fields	\N	\N	2024-08-16 14:04:28.243481+00	1
41701570-bdc7-419c-a637-25988d323c66	4eca9d3c00152fc300dc429c7c2a4936c4e5284098e48920797f2216c52b8f49	2024-08-16 14:04:28.426288+00	20231119204032_removed_accounts_table	\N	\N	2024-08-16 14:04:28.345884+00	1
4f529ec3-1d3d-46bb-9f1a-bc4aa6f16375	b24cc05eda640e73d0962d5e307d8e5facd3ad36a7ae1e8be740e0bd82c94474	2024-08-16 14:04:28.535794+00	20231122023841_update_time_gtm_fetch_setting	\N	\N	2024-08-16 14:04:28.459882+00	1
c3f99f2b-4684-4dad-8745-b818d84c46a6	298037b584dbde931c69fb229a2dbcae4b590f5155e55180e82f064a85be1241	2024-08-16 14:04:28.634238+00	20231122025359_	\N	\N	2024-08-16 14:04:28.562395+00	1
403294ff-0cad-4ac0-90a1-338b7abc3648	df32911cd0cac0ff3b0d1b312cc92ea4a87cd0f7353f1efe7b9c03cee705eded	2024-08-16 14:04:28.770407+00	20240202193612_ga_table	\N	\N	2024-08-16 14:04:28.666641+00	1
c6721678-abc9-4766-a9b3-08061c868c4b	2f7d94e4432914751f480a08a37f0b5eb328dca541c8115445d5aa2b360ec442	2024-08-16 14:04:28.875646+00	20240815020754_tier_feature_limit	\N	\N	2024-08-16 14:04:28.802686+00	1
7a90be42-0d77-4ede-b993-0e3f9e6d5728	dab72e31746eb242e90609aa4cfdf8829489e0cb163c3ed411be8e8e75c3abdf	2024-08-16 15:20:56.686937+00	20240816152056_tier_feature_limit	\N	\N	2024-08-16 15:20:56.583249+00	1
\.


--
-- Data for Name: ga; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ga" ("id", "user_id", "account_id", "property_id") FROM stdin;
cm0zdffem0000128rjekenb7p	user_2kprK1cBrS7au2ilAavEW74EoQx	300860996	457489557
cm0zemo850006128rodw6evk0	user_2kprK1cBrS7au2ilAavEW74EoQx	300860996	458384513
\.


--
-- Data for Name: gtm; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gtm" ("id", "user_id", "account_id", "container_id", "workspace_id") FROM stdin;
cm2ousub10000eq75amn5q63x	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	176415503	28
cm2ousug20001eq75xxwwzvz6	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	176415503	27
cm2oususl0002eq7526oc85k3	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	178534095	3
cm2ousv610003eq75ntwwwxs2	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196477275	5
cm2ousvma0004eq752dm0l4yf	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196481805	4
cm2ousw380005eq75cqp2jj6v	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196487539	3
cm1qi1zbr000jppoyrfxhezj5	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	178538015	2
cm1xxacwt0000o14gltrex9qo	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	178508282	3
cm1xxadls0001o14g0i4wdghj	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196480372	3
cm1xxae0s0003o14gfij4g8h2	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196482176	3
cm1xxae7w0004o14gscy9rx8g	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196482542	3
cm1xxael30005o14gcya6ykyk	user_2kprK1cBrS7au2ilAavEW74EoQx	6131153717	196488655	3
cm1xxaew90006o14g8xcwy6vn	user_2kprK1cBrS7au2ilAavEW74EoQx	6141326151	196565242	2
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
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY "supabase_functions"."hooks" ("id", "hook_table_id", "hook_name", "created_at", "request_id") FROM stdin;
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
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
