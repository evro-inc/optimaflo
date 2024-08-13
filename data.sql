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
prod_PR67hSV5IpooDJ	f	Analyst	Ideal for basic data management and automation needs.	\N	{"bulletOne": "Affordable Data Automation", "bulletTwo": "User Friendly UI", "bulletThree": "Scaled Data Management"}	1706916174
prod_PR6ETKqabgOXDt	f	Enterprise	Premium tier for businesses requiring extensive, tailored solutions with zero API limits.	\N	{"bulletOne": "Features included from other tiers", "bulletTwo": "Unlimited API Usage up to Google Limits", "bulletThree": "Unlimited Data Automation"}	1706916276
prod_PUV4HNwx8EuHOi	f	Analyst	Ideal for basic data management and automation needs.	\N	{}	1723307502
prod_PUV5bXKCjMOpz8	f	Consultant	Designed for businesses with moderate data management needs, requiring more advanced features.	\N	{}	1723307508
prod_PUV6oomP5QRnkp	f	Enterprise	Premium tier for businesses requiring extensive, tailored solutions with zero API limits.	\N	{}	1723307511
prod_QdZO0kPsz2tazE	t	Analyst	Ideal for basic data management and automation needs.	\N	{}	1723307704
prod_QdZQouN3OTAsys	t	Consultant	Designed for businesses with moderate data management needs, requiring more advanced features.	\N	{}	1723307801
prod_QdZQsrc5pD9fdl	t	Enterprise	Premium tier for businesses requiring extensive, tailored solutions with zero API limits.	\N	{}	1723307837
\.


--
-- Data for Name: Price; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Price" ("id", "product_id", "active", "description", "unit_amount", "currency", "type", "interval", "interval_count", "trial_period_days", "metadata", "recurringInterval", "recurringIntervalCount") FROM stdin;
price_1OcDvKJpXmm9uoVNZwVcE0J6	prod_PR67hSV5IpooDJ	t	\N	2999	usd	recurring	month	1	0	\N	month	1
price_1OcE2JJpXmm9uoVNbYzkXj2u	prod_PR6ETKqabgOXDt	t	\N	49999	usd	recurring	month	1	0	\N	month	1
price_1OcE5aJpXmm9uoVNurBwgDLL	prod_PR6ETKqabgOXDt	t	\N	500000	usd	recurring	year	1	0	\N	year	1
price_1OcE6AJpXmm9uoVN8bHF4a8s	prod_PR67hSV5IpooDJ	t	\N	30000	usd	recurring	year	1	0	\N	year	1
price_1OfU1XJpXmm9uoVNGLWdxXnB	prod_PR6ETKqabgOXDt	t	\N	1000000	usd	recurring	month	1	0	\N	month	1
price_1OfW4IJpXmm9uoVN598mWiar	prod_PUV4HNwx8EuHOi	t	\N	30000	usd	recurring	year	1	0	\N	year	1
price_1OfW5JJpXmm9uoVNnNHyIBjH	prod_PUV5bXKCjMOpz8	t	\N	9999	usd	recurring	month	1	0	\N	month	1
price_1OfW6pJpXmm9uoVN1vFDKKxo	prod_PUV6oomP5QRnkp	t	\N	500000	usd	recurring	year	1	0	\N	year	1
price_1OfU9nJpXmm9uoVNkS4amvpv	prod_PR67hSV5IpooDJ	t	\N	30000	usd	recurring	year	1	0	\N	year	1
price_1OfW4IJpXmm9uoVN5P9J3opl	prod_PUV4HNwx8EuHOi	t	\N	2999	usd	recurring	month	1	0	\N	month	1
price_1OfW6WJpXmm9uoVNh5C1lfrE	prod_PUV6oomP5QRnkp	t	\N	49999	usd	recurring	month	1	0	\N	month	1
price_1OfW5nJpXmm9uoVNyNq7s5DU	prod_PUV5bXKCjMOpz8	t	\N	100000	usd	recurring	month	1	0	\N	year	1
price_1PmIFvJpXmm9uoVNVYlVVNyC	prod_QdZO0kPsz2tazE	t	\N	2999	usd	recurring	month	1	0	\N	month	1
price_1PmIFvJpXmm9uoVNs9eNzJgJ	prod_QdZO0kPsz2tazE	t	\N	30000	usd	recurring	year	1	0	\N	year	1
price_1PmIHUJpXmm9uoVNZyV6j3kL	prod_QdZQouN3OTAsys	t	\N	100000	usd	recurring	year	1	0	\N	year	1
price_1PmIHUJpXmm9uoVNEzZtZk9n	prod_QdZQouN3OTAsys	t	\N	9999	usd	recurring	month	1	0	\N	month	1
price_1PmII4JpXmm9uoVNgPuH3Pyz	prod_QdZQsrc5pD9fdl	t	\N	49999	usd	recurring	month	1	0	\N	month	1
price_1PmII4JpXmm9uoVNu4BYBhEc	prod_QdZQsrc5pD9fdl	t	\N	500000	usd	recurring	year	1	0	\N	year	1
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."User" ("id", "stripeCustomerId", "subscriptionId", "subscriptionStatus", "name", "email", "emailVerified", "image", "role") FROM stdin;
user_2kRdmCzimWd2UQM4qkYGICjtvTI	\N	\N	\N	Ev Ro	crypto.evro@gmail.com	\N	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18ya1JkbURxSmpYM2k0dUJ1STJ5d1lhSmVXc3YifQ	USER
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Subscription" ("id", "user_id", "metadata", "price_id", "quantity", "cancel_at_period_end", "created", "current_period_start", "current_period_end", "ended_at", "cancel_at", "canceled_at", "trial_start", "trial_end", "product_id", "subId", "status") FROM stdin;
clzkkxz4f0006tr5yr47ds3wf	user_2kRdmCzimWd2UQM4qkYGICjtvTI	\N	price_1OfW6WJpXmm9uoVNh5C1lfrE	1	f	2024-08-08 01:08:45+00	2024-08-08 01:08:45+00	2024-09-08 01:08:45+00	\N	\N	\N	\N	\N	prod_PUV6oomP5QRnkp	sub_1PlKqPJpXmm9uoVNOCCFdvHh	active
\.


--
-- Data for Name: CheckoutSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."CheckoutSession" ("id", "paymentStatus", "amountTotal", "currency", "user_id", "subscription_id") FROM stdin;
cs_test_b16Vzq6GsLn90C6zoZibTC0ects66F8A7rxeltSyi3s0N4nIVY77lOwt7r	paid	49999	usd	user_2kRdmCzimWd2UQM4qkYGICjtvTI	clzkkxz4f0006tr5yr47ds3wf
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Customer" ("id", "stripe_customer_id", "user_id") FROM stdin;
clzkkx8mj0007nb4zpwvvczp3	cus_QcZzC6uTRdOuTc	user_2kRdmCzimWd2UQM4qkYGICjtvTI
\.


--
-- Data for Name: Feature; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Feature" ("id", "name", "description") FROM stdin;
ea85a197-574d-4482-95c5-eb340a981891	GTMContainer	GTMContainer
2b05bdfe-1d9e-4187-aaaf-801826f58164	GTMTags	GTMTags
b32ea738-3f4b-427a-8266-cde6dcb52fc8	GTMTriggers	GTMTriggers
db811e54-b176-4b9e-adba-66f6df6fb07a	GTMVariables	GTMVariables
72e8ceb0-e961-41ef-973a-759fee90d153	GTMWorkspaces	GTMWorkspaces
e3a50fc6-5f81-4e13-89fe-07ddd8a0ca06	GTMClients	GTMClients
0e9837f8-c6c1-4dcb-b144-401ce9e1e3cc	GTMFolders	GTMFolders
5771d60e-3eaa-49d4-9452-b7e810a04f49	GTMTemplates	GTMTemplates
4a3904bd-5d84-42d7-9df9-4530fc579774	GTMTransformations	GTMTransformations
80251a3a-27e7-4aa1-b8d0-1ddb7f36f91b	GTMZones	GTMZones
abd284a3-1764-489c-b81f-a056f1d85dff	GTMVersions	GTMVersions
cls0ng6hx00023wvkuo3f4mv7	GA4FBLinks	GA4FBLinks
cls0ng6hy00033wvkh2iwbdel	GA4Streams	GA4Streams
cls0ng6hy00043wvkwlzx82xa	GA4CustomMetrics	GA4CustomMetrics
cls0ng6hy00053wvkewexqefu	GA4CustomDimensions	GA4CustomDimensions
cls0ng6hy00063wvk0aavswvr	GA4ConversionEvents	GA4ConversionEvents
cls0ng6hy00073wvkxvoiyr72	GA4Properties	GA4Properties
cls0ng6hx00013wvk7t8es91w	GA4AdLinks	GA4AdLinks
cls0nergk00003wvklkwfl7ru	GA4Accounts	GA4Accounts
cltf2kzp90000gjool081xtpc	GA4AccountAccess	GA4AccountAccess
cltf2ldeo0001gjooh0qc28hs	GA4PropertyAccess	GA4PropertyAccess
cltix2fmp0004gjoo24h8nb3p	GA4Audiences	GA4Audiences
clwdq1bm30000b8gs90ha2wnz	GA4KeyEvents	GA4KeyEvents
0902ccd2-d611-4d41-8b23-3edf9c37ba66	GTMBuiltInVariables	GTMBuiltInVariables
clxc5q3ts000011h1lux0ybrf	GTMEnvs	GTMEnvs
clxp8utwn0000ezohlk75w9qt	GTMPermissions	GTMPermissions
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Invoice" ("id", "status", "created", "paid", "amount_due", "amount_paid", "currency", "customer_id", "due_date", "subscription_id", "user_id") FROM stdin;
in_1PlKqPJpXmm9uoVNQxoYGMtC	paid	2024-08-08 01:08:45+00	t	49999	49999	usd	cus_QcZzC6uTRdOuTc	2024-09-07 01:08:45+00	clzkkxz4f0006tr5yr47ds3wf	user_2kRdmCzimWd2UQM4qkYGICjtvTI
\.


--
-- Data for Name: ProductAccess; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ProductAccess" ("id", "productId", "granted", "user_id") FROM stdin;
cls6cr727006scez80dwbz3jq	prod_PUV4HNwx8EuHOi	t	\N
cls6cr73y006ycez8jwmoxdm7	prod_PUV5bXKCjMOpz8	t	\N
cls6cr75z0074cez8tq386gtb	prod_PUV6oomP5QRnkp	t	\N
clsp416c50001bah395qkoagh	prod_PUV4HNwx8EuHOi	t	\N
clsp416cm0003bah3eqaie3f4	prod_PUV5bXKCjMOpz8	t	\N
clsp416d10005bah3it7m3ak9	prod_PUV6oomP5QRnkp	t	\N
clsovvkm50001lqqd8hazqrdp	prod_PUV4HNwx8EuHOi	t	\N
clsovvkmj0003lqqdyyw8aedh	prod_PUV5bXKCjMOpz8	t	\N
clsovvkmv0005lqqdanrtp6x0	prod_PUV6oomP5QRnkp	t	\N
clzkkxzxi001ktr5yrkr3lvqb	prod_PUV4HNwx8EuHOi	t	user_2kRdmCzimWd2UQM4qkYGICjtvTI
clzkkxzy9001mtr5yosrgmq37	prod_PUV5bXKCjMOpz8	t	user_2kRdmCzimWd2UQM4qkYGICjtvTI
clzkkxzyq001otr5y40keqm1h	prod_PUV6oomP5QRnkp	t	user_2kRdmCzimWd2UQM4qkYGICjtvTI
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."Session" ("id", "user_id", "abandonAt", "clientId", "createdAt", "expireAt", "lastActiveAt", "status", "updatedAt") FROM stdin;
sess_2kM2kk9fXFP3qmStg5JjMFEFGUo	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725671269178	client_2kM0ylGJVOyohn37tt6T08zIsyt	1723079269178	1723684069178	1723079269178	ended	1723081018700
sess_2kM6KQV9a0NVNlDdkb0DPy95QQq	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725673033977	client_2kM6Jnk1gIg0RQpnDXrKXayoA9x	1723081033977	1723685833977	1723081033977	active	1723081034007
sess_2kRdmGXaS0kaZ6z8fNU8iMMM63q	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725842479458	client_2kRdllplGHQKRqPiUsybDykxScE	1723250479458	1723855279458	1723251295901	ended	1723296780554
sess_2kToKCBQcUViv3cUvXcu3jQlbEK	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725908860356	client_2kToK0A4ogZ5FM7iOn1EGu54Q7e	1723316860356	1723921660356	1723317629888	ended	1723317636836
sess_2kTptzRJbvGMVm3wwlZTmfFy9ti	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725909639830	client_2kTpu3GKNUemLRrgFERR8cXkCLg	1723317639830	1723922439830	1723334908864	ended	1723335243288
sess_2kUPbAGeWjim5xa4qG9HhA5GAe0	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725927250946	client_2kUPbDNUybEUs5tGkdNQcPZ0ldA	1723335250946	1723940050946	1723335250946	active	1723335250973
sess_2kT9dXAHAiu3qJ4X4s4poJcxIaG	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1725888786863	client_2kT9dALX12SKnKOtA1WQlaxlU8y	1723296786863	1723901586863	1723561092257	ended	1723568874103
sess_2kc38VlLifvlGBV87ADGLB3S7ia	user_2kRdmCzimWd2UQM4qkYGICjtvTI	1726160878876	client_2kc38IVkkZGEcJ5bBHcIkV0Z4vZ	1723568878876	1724173678876	1723568878876	active	1723568878913
\.


--
-- Data for Name: TierLimit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."TierLimit" ("id", "productId", "featureId", "subscriptionId", "createLimit", "updateLimit", "createUsage", "updateUsage", "deleteLimit", "deleteUsage") FROM stdin;
clzkkxzjk0008tr5ydw5rahs6	prod_PUV6oomP5QRnkp	ea85a197-574d-4482-95c5-eb340a981891	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjl000atr5yh3kwxcdf	prod_PUV6oomP5QRnkp	2b05bdfe-1d9e-4187-aaaf-801826f58164	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjl000ctr5yj9pxytlx	prod_PUV6oomP5QRnkp	b32ea738-3f4b-427a-8266-cde6dcb52fc8	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjl000etr5ynrors95i	prod_PUV6oomP5QRnkp	db811e54-b176-4b9e-adba-66f6df6fb07a	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjl000gtr5y6ry5xlo2	prod_PUV6oomP5QRnkp	72e8ceb0-e961-41ef-973a-759fee90d153	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjl000itr5yrsyq6i6z	prod_PUV6oomP5QRnkp	e3a50fc6-5f81-4e13-89fe-07ddd8a0ca06	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjl000ktr5yfwtkciq3	prod_PUV6oomP5QRnkp	0e9837f8-c6c1-4dcb-b144-401ce9e1e3cc	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjm000mtr5yy24edcw7	prod_PUV6oomP5QRnkp	5771d60e-3eaa-49d4-9452-b7e810a04f49	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjm000otr5yeiruip78	prod_PUV6oomP5QRnkp	4a3904bd-5d84-42d7-9df9-4530fc579774	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjm000qtr5yib0j8i6g	prod_PUV6oomP5QRnkp	80251a3a-27e7-4aa1-b8d0-1ddb7f36f91b	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjm000str5yz1t8mhd1	prod_PUV6oomP5QRnkp	abd284a3-1764-489c-b81f-a056f1d85dff	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjm000utr5y8a1epklo	prod_PUV6oomP5QRnkp	cls0nergk00003wvklkwfl7ru	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjn000wtr5ygq7excrb	prod_PUV6oomP5QRnkp	cls0ng6hy00073wvkxvoiyr72	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjn000ytr5ydsx9n7rv	prod_PUV6oomP5QRnkp	cls0ng6hy00063wvk0aavswvr	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjn0010tr5ylqdhluyu	prod_PUV6oomP5QRnkp	cls0ng6hy00053wvkewexqefu	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjn0012tr5y7kdl4tps	prod_PUV6oomP5QRnkp	cls0ng6hy00043wvkwlzx82xa	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjn0014tr5y3qai00f7	prod_PUV6oomP5QRnkp	cls0ng6hy00033wvkh2iwbdel	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjn0016tr5yup77zn8g	prod_PUV6oomP5QRnkp	cls0ng6hx00023wvkuo3f4mv7	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjo0018tr5y2b2316ha	prod_PUV6oomP5QRnkp	cls0ng6hx00013wvk7t8es91w	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjo001atr5ybxos850p	prod_PUV6oomP5QRnkp	cltf2kzp90000gjool081xtpc	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjo001ctr5y7butow6i	prod_PUV6oomP5QRnkp	cltf2ldeo0001gjooh0qc28hs	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjo001etr5y1quh5s6w	prod_PUV6oomP5QRnkp	cltix2fmp0004gjoo24h8nb3p	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
clzkkxzjo001gtr5yitb6h80i	prod_PUV6oomP5QRnkp	clwdq1bm30000b8gs90ha2wnz	clzkkxz4f0006tr5yr47ds3wf	10000	10000	0	0	10000	0
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") FROM stdin;
d06baa90-87b4-41df-9e49-2687dc096886	37d2dfb4432d85f396a771f740aacce80d86b426e474c1f21f1e2136997a7617	2023-10-13 00:58:29.704783+00	20230902002803_feature_limits	\N	\N	2023-10-13 00:58:29.616352+00	1
26e85429-5ae9-4309-8e23-e345018801fc	e0ed00bbde8e15ef3927713b710aa44843e6140849c5cf881725ecee8f704a3b	2023-10-13 00:58:26.412547+00	0_init	\N	\N	2023-10-13 00:58:26.237259+00	1
ee66c3ea-234b-4a39-8de7-31c35ed54e61	f4ffc15eb56d3ae979c0a1ef247b2b163e7e1bed172f6361e2e7595621488e0e	2023-10-13 00:58:27.936513+00	20230522230447_	\N	\N	2023-10-13 00:58:27.869498+00	1
5de17983-ba33-48af-a975-5b72c42120af	62c91d445d2586411efc739746cb8405d74b182d4b66119f4dd3b65ecea8ade7	2023-10-13 00:58:26.530614+00	20230508135144_	\N	\N	2023-10-13 00:58:26.440119+00	1
0f42a2b8-74f3-41ee-845c-d5a3230412db	98153af861fc134248492cf6557ecd74f09765059ff1f91cfce9905e32724d99	2023-10-13 00:58:26.649203+00	20230512013329_checkout_session_2	\N	\N	2023-10-13 00:58:26.55867+00	1
108f066a-21f3-4459-b859-17af840a811c	633881413cc963c94b6ee02fcd99a4b3529aa025adb226107c974f9190150225	2023-10-13 00:58:29.132669+00	20230614153801_gtm_setting_unique_user_id	\N	\N	2023-10-13 00:58:29.062067+00	1
099410df-f285-4e6a-9c38-f80f3d0b748c	32e71d081266a04260f20492a7181d2e974007de3e80278e8801a70e3ccb6e56	2023-10-13 00:58:26.76236+00	20230512222310_sub_product	\N	\N	2023-10-13 00:58:26.677886+00	1
c16c067b-9d30-4eb6-a5ff-f51efd3bd8ea	c4d44e4a4648a7befbf32884506234d7da5585175dd2986e73c2f010449b9212	2023-10-13 00:58:28.03078+00	20230523011621_	\N	\N	2023-10-13 00:58:27.957693+00	1
99b91f6c-8bad-41a1-80e2-cf1188577a77	00599cd4b403ea9904677194d6bd3df4d9b03cffa889e40ec0dfa6b608baf231	2023-10-13 00:58:26.853594+00	20230513163719_	\N	\N	2023-10-13 00:58:26.785747+00	1
3f086bd9-e9d2-45d5-99e1-9932da5c042e	d3706b4ad8e6aeac3181975a3e7cf86698bdfe9c470ff4b9559fafe25b3beab2	2023-10-13 00:58:26.970324+00	20230515154213_invoice	\N	\N	2023-10-13 00:58:26.881771+00	1
6ddf71e5-e759-4929-ab67-f34ac435afd1	13f5a73624c4237047c9cb79c8aad8d2155146559024e1aa94a97cf895093624	2023-10-13 00:58:27.105624+00	20230515155008_invoice_amt_due	\N	\N	2023-10-13 00:58:26.993495+00	1
729a58ad-dca0-4387-bf0c-3fbeb60c3f7f	b192e5c6cc51d1ab991f9370b9970aae8981206a5c0f394b7dd85b161a18a0e4	2023-10-13 00:58:28.149362+00	20230523175325_refactor_invoice	\N	\N	2023-10-13 00:58:28.06753+00	1
ddc0b310-90e3-4a89-a0e5-a9f98817dcc0	40f087215d679953b732acd536fa57e8b86bcfb0a71e73ceccccd46b8d452208	2023-10-13 00:58:27.210388+00	20230515160652_inv_refactor	\N	\N	2023-10-13 00:58:27.129094+00	1
abd11145-89cd-4365-8c51-552ce5fe1ca8	96edfcad219c004435c5d0efef8e0d9c546ba946b2c42e6bacc66d03846a22f4	2023-10-13 00:58:27.322171+00	20230515162342_due_date	\N	\N	2023-10-13 00:58:27.24204+00	1
adb29ccd-72dc-49bf-8dc9-eb1cdb77dffa	8070137e33ba5ff6da2c1846cf4c84eeb3d119595d784554412946d2cb52a55d	2023-10-13 00:58:27.413436+00	20230516173001_sub_update_id	\N	\N	2023-10-13 00:58:27.34732+00	1
409ab6db-d290-41a4-be3f-b210578c7b56	4092d1f4046bff27bb621955cfab20a546c59d1ceadc4fc7ffad3315c0c6d093	2023-10-13 00:58:28.251662+00	20230528212945_role_user	\N	\N	2023-10-13 00:58:28.183304+00	1
27bf64bc-5825-457e-95e0-f3d1e99e1453	bac743c7b09e689deac925de959ac18eda771a78eac0577f3e1a608c94f9afdd	2023-10-13 00:58:27.518323+00	20230516173252_remove_sub_id	\N	\N	2023-10-13 00:58:27.437014+00	1
962f8ddd-8bb2-4194-bc15-ff0b5435225a	a095b7f858925464866f6e9e84e09ebae7d9065bfb2151c5089e040a298f951d	2023-10-13 00:58:27.649996+00	20230518155251_invoice	\N	\N	2023-10-13 00:58:27.569453+00	1
faf38f80-3d16-4550-9aff-819b28c27db4	4b8dfbbbba44eaa37cd13a820d31faca109e7dfd06f77a46b7d8898fda9099c7	2023-10-13 00:58:29.249234+00	20230614155205_rename_gtm_setting	\N	\N	2023-10-13 00:58:29.156821+00	1
655ae216-8343-4aaa-be28-0a0c68f085a4	449911e92b512d689a87732881826eb6f00fa9dded4b3aa88ef7370de1b8f27c	2023-10-13 00:58:27.746102+00	20230522173644_init	\N	\N	2023-10-13 00:58:27.677165+00	1
da0e3a98-1f60-427f-bd18-6d2888f61cfb	d8d4d45aaf98b89a063923a70e9102e141c0466a0ec7a9d7b800cdcd4a22e152	2023-10-13 00:58:28.35793+00	20230602141755_roles	\N	\N	2023-10-13 00:58:28.281696+00	1
f23166fa-6c4d-4e0b-9667-9d4856e0e1ba	672c56d7bda14bf778fc989f36e829efbebaae55b4a8dad11724ec8698c8149e	2023-10-13 00:58:27.84158+00	20230522193206_invoice_id_mapping	\N	\N	2023-10-13 00:58:27.774753+00	1
a4d5746d-ad7d-419a-8a92-c9d9ecff9eaa	d9d61e1d36db971b83b0dceb5709c6ba1c804ed4bcbcc03c929307c84840bdca	2023-10-13 00:58:28.48643+00	20230602145330_	\N	\N	2023-10-13 00:58:28.401316+00	1
fceef42e-d9f7-486d-bc3b-a50635b25f26	7cb750c18846be0c5ac7c38d0740d76347a7ef742f9e8ed2a8d9dfac22eebf77	2023-10-13 00:58:30.283499+00	20230906132525_	\N	\N	2023-10-13 00:58:30.214319+00	1
a262a15a-da19-4986-9730-d1926edeb19c	e73e704be6006c55f870a95fef58bf5b359e1f0c291ac33c98ce9489150bbe70	2023-10-13 00:58:28.594859+00	20230607171137_	\N	\N	2023-10-13 00:58:28.513525+00	1
b94ced99-7a76-425f-9713-e53557c5fc44	cefbf2d038fe58b1db9c2732c780605187a365a8226ea3b136236cff5d30151b	2023-10-13 00:58:29.357829+00	20230614155502_gtmsetting_refactor	\N	\N	2023-10-13 00:58:29.275411+00	1
1a412fae-cdee-43fd-86e0-c5841dc02552	d6d3dc4d58d0ea18460d58cc3852b883e7af18b8e9a4d6c9469f42e1aa8cc109	2023-10-13 00:58:28.829008+00	20230613173612_product_access	\N	\N	2023-10-13 00:58:28.676672+00	1
651eef14-99b3-445b-94c6-6e3b6cdbce5e	07321d54fc771e8af5236aeef6b71254a16cf60c9ea5197c91578d70af73d23d	2023-10-13 00:58:29.013118+00	20230614131505_gtm_setting	\N	\N	2023-10-13 00:58:28.857735+00	1
c2df9e94-736f-41ea-b81b-9d57e52891a9	65d6817a8365859275b316596020921337e798f5d59abf18128091366db9bd22	2023-10-13 00:58:29.797887+00	20230904180641_limit_feature_col	\N	\N	2023-10-13 00:58:29.733001+00	1
d0dbe930-1163-4b81-aa5a-3e73f398ac7c	9dae225fa56b4c660f6cf7bb713a2a527e558e4b195cf1e0c1a34267587d33a9	2023-10-13 00:58:29.468655+00	20230614163405_gtm	\N	\N	2023-10-13 00:58:29.391186+00	1
ea3aa475-417d-4060-a96c-11ad52c47f8a	c381104e89258578323d70bf767221075e467b6560802277796765d748ba84df	2023-10-13 00:58:29.585149+00	20230614172301_	\N	\N	2023-10-13 00:58:29.50963+00	1
92659ac8-3254-4d3e-b37c-1ede7c9ee4dd	f1503195a11c3e8480253c485409cbd38daa7e8c454633ee14f7fdad1bcc70c5	2023-10-13 00:58:30.094439+00	20230905152523_tier_limit_composite	\N	\N	2023-10-13 00:58:30.022002+00	1
daf253d2-1cf4-4a9d-a883-d64a70d29913	1ec3997a8ee05799abd2965a01d429d0beb58902c615b47199141b48bfe89012	2023-10-13 00:58:29.894234+00	20230904182754_	\N	\N	2023-10-13 00:58:29.822498+00	1
a4f15f5d-72b3-464d-bc19-b214d587998a	f5349a3fab696247120c5d3c9de1419d350cb044d91e8f4a1bba74ff3fb2dcba	2023-10-13 00:58:29.991899+00	20230904185347_usage_tier	\N	\N	2023-10-13 00:58:29.919032+00	1
428091d3-29ca-4c23-bead-adedce2f2b85	7f9ee04afbb0e762704ca23f4fe786aa5a15ac9b2d30fbd56c56f29c8e7b306d	2023-10-13 00:58:30.18594+00	20230906130938_create_update_limit_tiers	\N	\N	2023-10-13 00:58:30.121877+00	1
5c8b61d6-e67d-4ccd-b6b7-61e5bd8ce17e	29e3508d92760794204613b287b5fa4f469356f92cbd5a71e03cb80a7e3b0913	2023-10-13 00:58:30.468634+00	20231013005450_unique_gtm_entries	\N	\N	2023-10-13 00:58:30.398118+00	1
61392eb6-51d1-4d79-a498-d2ae4fff1fb7	46c3d7a7b204ab9f3352db26cc7133c7f4b4f8ab76440d1bfcf0385c6bc58da7	2023-10-13 00:58:30.372995+00	20230906191217_delete_feature_tiers	\N	\N	2023-10-13 00:58:30.309405+00	1
59f671ee-405f-4b36-900c-4aedf561cde7	d0e3208ecd3d0ae212fee525d1798622fbcce9392f17a7d9e061b5c2ecce3530	2023-11-16 17:41:47.717796+00	20231116174147_clerk	\N	\N	2023-11-16 17:41:47.509103+00	1
68001b7b-716e-4f95-9b8a-e75692b2d79a	54d059592f83ee4e4a74e4757e2c819f05a44de5fff4f3903d7596bcf8ba5d82	2023-11-19 16:08:00.788829+00	20231119160800_remove_uuid	\N	\N	2023-11-19 16:08:00.713529+00	1
a27a2238-d96e-41df-b63d-81b91bd19dae	5197d4f2d3ade200faeaacaae543716de53e268bb26fba514319fc1559de8a02	2023-11-19 16:43:33.073195+00	20231119164332_del_verification_table	\N	\N	2023-11-19 16:43:33.013718+00	1
6cf9d449-d6ca-4d4f-99c4-5e9ed7eacdf0	23ffd328fa3596625f4132fb683f872459a7e75ed5100c4c5d8225e4091edf2c	2023-11-19 20:27:19.318341+00	20231119202719_session_clerk	\N	\N	2023-11-19 20:27:19.247554+00	1
1820e58d-7c48-4c54-a274-ac0a8efab3af	d9aa7270669a43a020f14c27088d8a68adbc930e7057e454f37b004360580f52	2023-11-19 20:34:14.332034+00	20231119203414_session_int	\N	\N	2023-11-19 20:34:14.231163+00	1
93084d7a-1a7e-4995-9cbe-0f367836ca9b	8da31e5813cbc22b3d95c2526653755024b92e36502c59c5d289b94356cb46f3	2023-11-19 20:37:44.481474+00	20231119203744_remove_session_fields	\N	\N	2023-11-19 20:37:44.405227+00	1
dcf4a6cc-f410-4363-ba1e-0eff913b798b	4eca9d3c00152fc300dc429c7c2a4936c4e5284098e48920797f2216c52b8f49	2023-11-19 20:40:33.134063+00	20231119204032_removed_accounts_table	\N	\N	2023-11-19 20:40:33.067137+00	1
b619c8b3-fbbf-44f1-9872-d053ee02cf41	b24cc05eda640e73d0962d5e307d8e5facd3ad36a7ae1e8be740e0bd82c94474	2023-11-22 02:38:41.98786+00	20231122023841_update_time_gtm_fetch_setting	\N	\N	2023-11-22 02:38:41.907283+00	1
31e39a44-aad6-4704-9e31-d1f5b90adc4c	298037b584dbde931c69fb229a2dbcae4b590f5155e55180e82f064a85be1241	2023-11-22 02:53:59.475272+00	20231122025359_	\N	\N	2023-11-22 02:53:59.406146+00	1
4e564a86-213d-4b62-9684-b1d8f7c778dc	df32911cd0cac0ff3b0d1b312cc92ea4a87cd0f7353f1efe7b9c03cee705eded	2024-02-02 21:41:45.0031+00	20240202193612_ga_table	\N	\N	2024-02-02 21:41:44.914336+00	1
f7494ff9-6277-40ff-b994-3d2162fc3a1d	6ceef05fa4276c376e898ca3eefe2b706e8ba4be57bd9ab5038ddf1ec2c08e49	2024-06-02 02:32:39.857156+00	20240602023239_add_status_to_ga	\N	\N	2024-06-02 02:32:39.779286+00	1
\.


--
-- Data for Name: ga; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ga" ("id", "user_id", "account_id", "property_id", "status") FROM stdin;
clzn5uxdl0006ya0b6do5rj5g	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/260310161	357901472	\N
clzn5uxmn0007ya0bc9ge5fwi	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/300860996	426648744	\N
clzn5uxrt0008ya0bb4nb0p8p	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/300860996	428849133	\N
clzn5uxx50009ya0bbllo4ngw	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/300860996	428843375	\N
clzn5uwb90000ya0bp33i4lpd	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/240133506	330596172	\N
clzn5uwgr0001ya0b8p6n57f2	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/240133506	331458876	\N
clzn5uwl50002ya0b5x6z2fiv	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/240133506	353795135	\N
clzn5uwpn0003ya0btp5t11zv	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/240133506	354471664	\N
clzn5uwxn0004ya0bsaggsmeo	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/240133506	443227926	\N
clzn5ux4u0005ya0bgjnd53r9	user_2kRdmCzimWd2UQM4qkYGICjtvTI	accounts/240133506	443194426	\N
\.


--
-- Data for Name: gtm; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."gtm" ("id", "user_id", "account_id", "container_id", "workspace_id") FROM stdin;
clzklzh3o002gnb4zrdlfzxxm	user_2kRdmCzimWd2UQM4qkYGICjtvTI	6051211458	165040396	202
clzklzhbm002hnb4z69f0fmaa	user_2kRdmCzimWd2UQM4qkYGICjtvTI	6051211458	188359717	6
clzklzhoc002inb4ziki71wbk	user_2kRdmCzimWd2UQM4qkYGICjtvTI	6141326151	176345981	2
clzklzhxg002jnb4zqeosz7et	user_2kRdmCzimWd2UQM4qkYGICjtvTI	6141326151	177249347	3
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
