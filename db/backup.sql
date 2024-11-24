toc.dat                                                                                             0000600 0004000 0002000 00000063641 14557242024 0014456 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        PGDMP       -    #                |            optimaflo_local    14.9 (Homebrew)    15.4 (Homebrew) O    x           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false         y           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false         z           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false         {           1262    21148    optimaflo_local    DATABASE     q   CREATE DATABASE optimaflo_local WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C';
    DROP DATABASE optimaflo_local;
                postgres    false         |           0    0    DATABASE optimaflo_local    ACL     /   GRANT ALL ON DATABASE optimaflo_local TO evro;
                   postgres    false    3707                     2615    54370    public    SCHEMA     2   -- *not* creating schema, since initdb creates it
 2   -- *not* dropping schema, since initdb creates it
                evro    false         }           0    0    SCHEMA public    COMMENT         COMMENT ON SCHEMA public IS '';
                   evro    false    5         ~           0    0    SCHEMA public    ACL     +   REVOKE USAGE ON SCHEMA public FROM PUBLIC;
                   evro    false    5         H           1247    54386    PricingPlanInterval    TYPE     e   CREATE TYPE public."PricingPlanInterval" AS ENUM (
    'day',
    'week',
    'month',
    'year'
);
 (   DROP TYPE public."PricingPlanInterval";
       public          evro    false    5         E           1247    54381    PricingType    TYPE     N   CREATE TYPE public."PricingType" AS ENUM (
    'one_time',
    'recurring'
);
     DROP TYPE public."PricingType";
       public          evro    false    5         l           1247    54585    Role    TYPE     ?   CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'USER'
);
    DROP TYPE public."Role";
       public          evro    false    5         K           1247    54396    SubscriptionStatus    TYPE     �   CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);
 '   DROP TYPE public."SubscriptionStatus";
       public          evro    false    5         �            1259    54413    Account    TABLE     F  CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);
    DROP TABLE public."Account";
       public         heap    evro    false    5         �            1259    54504    CheckoutSession    TABLE     �   CREATE TABLE public."CheckoutSession" (
    id text NOT NULL,
    "paymentStatus" text NOT NULL,
    "amountTotal" integer NOT NULL,
    currency text NOT NULL,
    user_id uuid NOT NULL,
    subscription_id text NOT NULL
);
 %   DROP TABLE public."CheckoutSession";
       public         heap    evro    false    5         �            1259    54439    Customer    TABLE     z   CREATE TABLE public."Customer" (
    id uuid NOT NULL,
    stripe_customer_id text NOT NULL,
    user_id uuid NOT NULL
);
    DROP TABLE public."Customer";
       public         heap    evro    false    5         �            1259    54529    Invoice    TABLE     �  CREATE TABLE public."Invoice" (
    id text NOT NULL,
    status text NOT NULL,
    created timestamp with time zone NOT NULL,
    paid boolean NOT NULL,
    amount_due integer NOT NULL,
    amount_paid integer NOT NULL,
    currency text NOT NULL,
    customer_id text NOT NULL,
    due_date timestamp with time zone NOT NULL,
    subscription_id text NOT NULL,
    "userId" uuid
);
    DROP TABLE public."Invoice";
       public         heap    evro    false    5         �            1259    54453    Price    TABLE     �  CREATE TABLE public."Price" (
    id text NOT NULL,
    product_id text NOT NULL,
    active boolean NOT NULL,
    description text,
    unit_amount integer NOT NULL,
    currency text NOT NULL,
    type public."PricingType" NOT NULL,
    "interval" public."PricingPlanInterval" NOT NULL,
    interval_count integer NOT NULL,
    trial_period_days integer NOT NULL,
    metadata jsonb,
    "recurringInterval" text,
    "recurringIntervalCount" integer
);
    DROP TABLE public."Price";
       public         heap    evro    false    840    5    837         �            1259    54446    Product    TABLE     �   CREATE TABLE public."Product" (
    id text NOT NULL,
    active boolean NOT NULL,
    name text NOT NULL,
    description text,
    image text,
    metadata jsonb,
    updated integer NOT NULL
);
    DROP TABLE public."Product";
       public         heap    evro    false    5         �            1259    54592    ProductAccess    TABLE     �   CREATE TABLE public."ProductAccess" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    "productId" text NOT NULL,
    granted boolean DEFAULT false NOT NULL
);
 #   DROP TABLE public."ProductAccess";
       public         heap    evro    false    5         �            1259    54420    Session    TABLE     �   CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    user_id uuid NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);
    DROP TABLE public."Session";
       public         heap    evro    false    5         �            1259    54460    Subscription    TABLE     �  CREATE TABLE public."Subscription" (
    id text NOT NULL,
    user_id uuid NOT NULL,
    metadata jsonb,
    price_id text NOT NULL,
    quantity integer NOT NULL,
    cancel_at_period_end boolean NOT NULL,
    created timestamp with time zone NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    cancel_at timestamp with time zone,
    canceled_at timestamp with time zone,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    product_id text NOT NULL,
    "subId" text NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'trialing'::public."SubscriptionStatus" NOT NULL
);
 "   DROP TABLE public."Subscription";
       public         heap    evro    false    843    843    5         �            1259    54427    User    TABLE     .  CREATE TABLE public."User" (
    id uuid NOT NULL,
    "stripeCustomerId" text,
    "subscriptionId" text,
    "subscriptionStatus" text,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL
);
    DROP TABLE public."User";
       public         heap    evro    false    876    876    5         �            1259    54434    VerificationToken    TABLE     �   CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);
 '   DROP TABLE public."VerificationToken";
       public         heap    evro    false    5         �            1259    54371    _prisma_migrations    TABLE     �  CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);
 &   DROP TABLE public._prisma_migrations;
       public         heap    evro    false    5         �            1259    54641    gtm    TABLE     �   CREATE TABLE public.gtm (
    id text NOT NULL,
    user_id uuid NOT NULL,
    account_id text NOT NULL,
    container_id text NOT NULL,
    workspace_id text NOT NULL
);
    DROP TABLE public.gtm;
       public         heap    evro    false    5         j          0    54413    Account 
   TABLE DATA           �   COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
    public          evro    false    210       3690.dat r          0    54504    CheckoutSession 
   TABLE DATA           s   COPY public."CheckoutSession" (id, "paymentStatus", "amountTotal", currency, user_id, subscription_id) FROM stdin;
    public          evro    false    218       3698.dat n          0    54439    Customer 
   TABLE DATA           E   COPY public."Customer" (id, stripe_customer_id, user_id) FROM stdin;
    public          evro    false    214       3694.dat s          0    54529    Invoice 
   TABLE DATA           �   COPY public."Invoice" (id, status, created, paid, amount_due, amount_paid, currency, customer_id, due_date, subscription_id, "userId") FROM stdin;
    public          evro    false    219       3699.dat p          0    54453    Price 
   TABLE DATA           �   COPY public."Price" (id, product_id, active, description, unit_amount, currency, type, "interval", interval_count, trial_period_days, metadata, "recurringInterval", "recurringIntervalCount") FROM stdin;
    public          evro    false    216       3696.dat o          0    54446    Product 
   TABLE DATA           \   COPY public."Product" (id, active, name, description, image, metadata, updated) FROM stdin;
    public          evro    false    215       3695.dat t          0    54592    ProductAccess 
   TABLE DATA           M   COPY public."ProductAccess" (id, "userId", "productId", granted) FROM stdin;
    public          evro    false    220       3700.dat k          0    54420    Session 
   TABLE DATA           I   COPY public."Session" (id, "sessionToken", user_id, expires) FROM stdin;
    public          evro    false    211       3691.dat q          0    54460    Subscription 
   TABLE DATA           �   COPY public."Subscription" (id, user_id, metadata, price_id, quantity, cancel_at_period_end, created, current_period_start, current_period_end, ended_at, cancel_at, canceled_at, trial_start, trial_end, product_id, "subId", status) FROM stdin;
    public          evro    false    217       3697.dat l          0    54427    User 
   TABLE DATA           �   COPY public."User" (id, "stripeCustomerId", "subscriptionId", "subscriptionStatus", name, email, "emailVerified", image, role) FROM stdin;
    public          evro    false    212       3692.dat m          0    54434    VerificationToken 
   TABLE DATA           I   COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
    public          evro    false    213       3693.dat i          0    54371    _prisma_migrations 
   TABLE DATA           �   COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
    public          evro    false    209       3689.dat u          0    54641    gtm 
   TABLE DATA           R   COPY public.gtm (id, user_id, account_id, container_id, workspace_id) FROM stdin;
    public          evro    false    221       3701.dat �           2606    54419    Account Account_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);
 B   ALTER TABLE ONLY public."Account" DROP CONSTRAINT "Account_pkey";
       public            evro    false    210         �           2606    54510 $   CheckoutSession CheckoutSession_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY (id);
 R   ALTER TABLE ONLY public."CheckoutSession" DROP CONSTRAINT "CheckoutSession_pkey";
       public            evro    false    218         �           2606    54445    Customer Customer_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);
 D   ALTER TABLE ONLY public."Customer" DROP CONSTRAINT "Customer_pkey";
       public            evro    false    214         �           2606    54536    Invoice Invoice_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);
 B   ALTER TABLE ONLY public."Invoice" DROP CONSTRAINT "Invoice_pkey";
       public            evro    false    219         �           2606    54459    Price Price_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public."Price"
    ADD CONSTRAINT "Price_pkey" PRIMARY KEY (id);
 >   ALTER TABLE ONLY public."Price" DROP CONSTRAINT "Price_pkey";
       public            evro    false    216         �           2606    54599     ProductAccess ProductAccess_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public."ProductAccess"
    ADD CONSTRAINT "ProductAccess_pkey" PRIMARY KEY (id);
 N   ALTER TABLE ONLY public."ProductAccess" DROP CONSTRAINT "ProductAccess_pkey";
       public            evro    false    220         �           2606    54452    Product Product_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);
 B   ALTER TABLE ONLY public."Product" DROP CONSTRAINT "Product_pkey";
       public            evro    false    215         �           2606    54426    Session Session_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);
 B   ALTER TABLE ONLY public."Session" DROP CONSTRAINT "Session_pkey";
       public            evro    false    211         �           2606    54466    Subscription Subscription_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);
 L   ALTER TABLE ONLY public."Subscription" DROP CONSTRAINT "Subscription_pkey";
       public            evro    false    217         �           2606    54433    User User_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_pkey";
       public            evro    false    212         �           2606    54379 *   _prisma_migrations _prisma_migrations_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public._prisma_migrations DROP CONSTRAINT _prisma_migrations_pkey;
       public            evro    false    209         �           2606    54655    gtm gtm_pkey 
   CONSTRAINT     J   ALTER TABLE ONLY public.gtm
    ADD CONSTRAINT gtm_pkey PRIMARY KEY (id);
 6   ALTER TABLE ONLY public.gtm DROP CONSTRAINT gtm_pkey;
       public            evro    false    221         �           1259    54467 &   Account_provider_providerAccountId_key    INDEX     ~   CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");
 <   DROP INDEX public."Account_provider_providerAccountId_key";
       public            evro    false    210    210         �           1259    54568    Customer_stripe_customer_id_key    INDEX     m   CREATE UNIQUE INDEX "Customer_stripe_customer_id_key" ON public."Customer" USING btree (stripe_customer_id);
 5   DROP INDEX public."Customer_stripe_customer_id_key";
       public            evro    false    214         �           1259    54600 "   ProductAccess_userId_productId_key    INDEX     x   CREATE UNIQUE INDEX "ProductAccess_userId_productId_key" ON public."ProductAccess" USING btree ("userId", "productId");
 8   DROP INDEX public."ProductAccess_userId_productId_key";
       public            evro    false    220    220         �           1259    54468    Session_sessionToken_key    INDEX     a   CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");
 .   DROP INDEX public."Session_sessionToken_key";
       public            evro    false    211         �           1259    54561    Subscription_subId_key    INDEX     ]   CREATE UNIQUE INDEX "Subscription_subId_key" ON public."Subscription" USING btree ("subId");
 ,   DROP INDEX public."Subscription_subId_key";
       public            evro    false    217         �           1259    54528 #   Subscription_user_id_product_id_key    INDEX     v   CREATE UNIQUE INDEX "Subscription_user_id_product_id_key" ON public."Subscription" USING btree (user_id, product_id);
 9   DROP INDEX public."Subscription_user_id_product_id_key";
       public            evro    false    217    217         �           1259    54471    User_email_key    INDEX     K   CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);
 $   DROP INDEX public."User_email_key";
       public            evro    false    212         �           1259    54469    User_stripeCustomerId_key    INDEX     c   CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON public."User" USING btree ("stripeCustomerId");
 /   DROP INDEX public."User_stripeCustomerId_key";
       public            evro    false    212         �           1259    54470    User_subscriptionId_key    INDEX     _   CREATE UNIQUE INDEX "User_subscriptionId_key" ON public."User" USING btree ("subscriptionId");
 -   DROP INDEX public."User_subscriptionId_key";
       public            evro    false    212         �           1259    54473 &   VerificationToken_identifier_token_key    INDEX     |   CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);
 <   DROP INDEX public."VerificationToken_identifier_token_key";
       public            evro    false    213    213         �           1259    54472    VerificationToken_token_key    INDEX     e   CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);
 1   DROP INDEX public."VerificationToken_token_key";
       public            evro    false    213         �           1259    54648    gtmSettingsUserId    INDEX     F   CREATE INDEX "gtmSettingsUserId" ON public.gtm USING btree (user_id);
 '   DROP INDEX public."gtmSettingsUserId";
       public            evro    false    221         �           1259    54512    subscriptionId    INDEX     Y   CREATE INDEX "subscriptionId" ON public."CheckoutSession" USING btree (subscription_id);
 $   DROP INDEX public."subscriptionId";
       public            evro    false    218         �           1259    54511    userId    INDEX     I   CREATE INDEX "userId" ON public."CheckoutSession" USING btree (user_id);
    DROP INDEX public."userId";
       public            evro    false    218         �           2606    54555    Account Account_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 I   ALTER TABLE ONLY public."Account" DROP CONSTRAINT "Account_userId_fkey";
       public          evro    false    212    210    3507         �           2606    54518 4   CheckoutSession CheckoutSession_subscription_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 b   ALTER TABLE ONLY public."CheckoutSession" DROP CONSTRAINT "CheckoutSession_subscription_id_fkey";
       public          evro    false    3520    217    218         �           2606    54513 ,   CheckoutSession CheckoutSession_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 Z   ALTER TABLE ONLY public."CheckoutSession" DROP CONSTRAINT "CheckoutSession_user_id_fkey";
       public          evro    false    212    3507    218         �           2606    54484    Customer Customer_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 L   ALTER TABLE ONLY public."Customer" DROP CONSTRAINT "Customer_user_id_fkey";
       public          evro    false    3507    212    214         �           2606    54569     Invoice Invoice_customer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public."Customer"(stripe_customer_id) ON UPDATE CASCADE ON DELETE RESTRICT;
 N   ALTER TABLE ONLY public."Invoice" DROP CONSTRAINT "Invoice_customer_id_fkey";
       public          evro    false    3514    214    219         �           2606    54574 $   Invoice Invoice_subscription_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 R   ALTER TABLE ONLY public."Invoice" DROP CONSTRAINT "Invoice_subscription_id_fkey";
       public          evro    false    3520    219    217         �           2606    54579    Invoice Invoice_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 I   ALTER TABLE ONLY public."Invoice" DROP CONSTRAINT "Invoice_userId_fkey";
       public          evro    false    219    212    3507         �           2606    54489    Price Price_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Price"
    ADD CONSTRAINT "Price_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 I   ALTER TABLE ONLY public."Price" DROP CONSTRAINT "Price_product_id_fkey";
       public          evro    false    216    3516    215         �           2606    54606 *   ProductAccess ProductAccess_productId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."ProductAccess"
    ADD CONSTRAINT "ProductAccess_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 X   ALTER TABLE ONLY public."ProductAccess" DROP CONSTRAINT "ProductAccess_productId_fkey";
       public          evro    false    215    3516    220         �           2606    54601 '   ProductAccess ProductAccess_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."ProductAccess"
    ADD CONSTRAINT "ProductAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 U   ALTER TABLE ONLY public."ProductAccess" DROP CONSTRAINT "ProductAccess_userId_fkey";
       public          evro    false    220    3507    212         �           2606    54479    Session Session_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
 J   ALTER TABLE ONLY public."Session" DROP CONSTRAINT "Session_user_id_fkey";
       public          evro    false    3507    211    212         �           2606    54499 '   Subscription Subscription_price_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_price_id_fkey" FOREIGN KEY (price_id) REFERENCES public."Price"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 U   ALTER TABLE ONLY public."Subscription" DROP CONSTRAINT "Subscription_price_id_fkey";
       public          evro    false    216    3518    217         �           2606    54523 )   Subscription Subscription_product_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 W   ALTER TABLE ONLY public."Subscription" DROP CONSTRAINT "Subscription_product_id_fkey";
       public          evro    false    3516    217    215         �           2606    54494 &   Subscription Subscription_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 T   ALTER TABLE ONLY public."Subscription" DROP CONSTRAINT "Subscription_user_id_fkey";
       public          evro    false    217    212    3507         �           2606    54649    gtm gtm_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.gtm
    ADD CONSTRAINT gtm_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 >   ALTER TABLE ONLY public.gtm DROP CONSTRAINT gtm_user_id_fkey;
       public          evro    false    221    212    3507                                                                                                       3690.dat                                                                                            0000600 0004000 0002000 00000021155 14557242024 0014264 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        bc8cc25d-1e86-4170-8166-b8e01e2248af	5e690ded-d397-4013-9e05-b4dc9b9aa18f	oauth	google	117183115838347796812	1//0d6_kl8D0XjDmCgYIARAAGA0SNwF-L9IrxRDREF7VSR76EFGSSiDdqQBD2Y3svGcnEo97RkQILfJz6Y4vEcIY0AVFZjZj7CKN3yg	ya29.a0AbVbY6Naem8lDQW3bcaoddpGYt1o5qHgGZiM4qY2S1t-SSlI7hFsjaljjf4DgRQvBvBzqTsTo5yy4kHk0LxxrWd0X_A5lgI2t85HcTsfwWcM-qT9FiLzPr3yz6wSjGtND5eNBIdvU8qQDYvka7sIIIic8fDOwiMaCgYKASUSARISFQFWKvPl4QKb_BP8SOzXub59zgN1PQ0166	1689459306	Bearer	https://www.googleapis.com/auth/analytics.edit openid https://www.googleapis.com/auth/tagmanager.edit.containerversions https://www.googleapis.com/auth/tagmanager.readonly https://www.googleapis.com/auth/tagmanager.manage.accounts https://www.googleapis.com/auth/tagmanager.delete.containers https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/tagmanager.manage.users https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/tagmanager.publish	eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3NmRhOWQzMTJjMzlhNDI5OTMyZjU0M2U2YzFiNmU2NTEyZTQ5ODMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTcxODMxMTU4MzgzNDc3OTY4MTIiLCJlbWFpbCI6ImNvbm5pZXNhbnRhNTFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJWY1FaOTlpbGtUUXY3MnZuaG81aXNnIiwibmFtZSI6IkNvbm5pZSBTYW50YSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQWNIVHRlOXVQZDRqckRUamlDcGF1cndENTNhM2ViXzI3UHUxcTA5ZGNZckRoaGg9czk2LWMiLCJnaXZlbl9uYW1lIjoiQ29ubmllIiwiZmFtaWx5X25hbWUiOiJTYW50YSIsImxvY2FsZSI6ImVuIiwiaWF0IjoxNjg5NDUxNzM4LCJleHAiOjE2ODk0NTUzMzh9.a1wbKKJtelM_sO5KnbC_1V6LX0Cf6z867ouHezDTjh-Mqr_iYY1VI2DgvuZs1jMQDoYc3K37ogq0tLJaTeSZJfZEfKauaOUr1tjmnBSKtsh20-fMRSbfwVRUX5MNHed6Q9ChJqH9rb9LN4ggTszOoATf33KqFlW_evL0Oog2GmvUUV0pjzC_DWo8ZLYLe0fmS4tu7tK5tud760JIO49guWf8UbLuX6jBu1siTih6vXCTK-fszfddjVKN8XDF6_gm-Lc7YOsB1RI38hM1pnj3hKCipqlfm7_el4cItawOinJf10kzLLYCtrNxKFoscWTKC9F-XUDz0-VbxcHZpnJs8A	\N
d7cc4d3a-4eec-4de1-aa72-c7ccedf9718b	7943ca75-e243-48e4-82f8-942799ec3066	oauth	google	108546359150929975958	1//0dgO2pYKQzL8FCgYIARAAGA0SNQF-L9Ir-ooyRfBWui7A_plKuiINnqqNM4bOX7SzEAMlwn0HwUW0Wpd_4PKT7Mr9ojCv5LZL	ya29.a0AbVbY6PPFBnekWXMGCfVpmdsE4HnhiM6vTGKLP0npegXdK1OaleRQfxDOOipcu3X5VJ2aVuitY9aC4P46jIHvbyN3VGlaGUfrnhG_hy-d2mQheMJTqLBMwd7gH1e3eibsM6p2eZx_KqwXVL6qUgpOnPv9-8MaCgYKAVQSARESFQFWKvPlXgsvannwuaHoMHmUjcKeoA0163	1689469789	Bearer	https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/tagmanager.manage.users https://www.googleapis.com/auth/tagmanager.delete.containers https://www.googleapis.com/auth/tagmanager.manage.accounts https://www.googleapis.com/auth/tagmanager.edit.containerversions https://www.googleapis.com/auth/tagmanager.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/tagmanager.publish openid https://www.googleapis.com/auth/tagmanager.edit.containers	eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3NmRhOWQzMTJjMzlhNDI5OTMyZjU0M2U2YzFiNmU2NTEyZTQ5ODMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDg1NDYzNTkxNTA5Mjk5NzU5NTgiLCJlbWFpbCI6ImV2cm8ub3B0aW1hZmxvQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdF9oYXNoIjoiLUxrUlRQSEtwdXlSckExM0hUWjJ0USIsIm5hbWUiOiJldiBybyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQWNIVHRkaDZwblZhTUJzbl8tTHBGb1JPNUFNYlV2WWhKaHMwTl9ETmdHZkp3PXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6ImV2IiwiZmFtaWx5X25hbWUiOiJybyIsImxvY2FsZSI6ImVuIiwiaWF0IjoxNjg5NDY2MTkwLCJleHAiOjE2ODk0Njk3OTB9.DR7udPASXCfc-0XHaM63ui_LoYrN5dnIvM6F9JnG1wxy7v4eswZFNG2GQlsIIxW6wD6LQRd-1JCzk1ffdrGvsZzu0BD07UEIsD1VshZFxH6kGJxMo3gKXFJBkALcLn316688XWhRfotQbmypRCn9xQXQvbI75JRvnc5ZCmAaLxUndVerXqA4W2m3WXTxPmRwdJRy1gAMpH2V7pb0SBZdPxqkpwOnyFiUJocmB61aTVR0Qn_F3H8IWJhzGHKT2KSH1cJ6MgPNoOfH5gL3Kb03IK7yTy005b7LslhvzkNsnBYBNNt8yNvmrz6Fi7m9YsRe8996F9kJE86Hy7y82vnDNA	\N
845b19f1-4606-4678-8aed-6407ea6dc835	8f3472b5-e0a9-4e60-bf3d-495f24e97b8a	oauth	google	117487876325718976390	1//0d_ZC0BIrO0ZoCgYIARAAGA0SNwF-L9Ir-ndsTkjh2rtGRj34z3_5clBDr9_wQNe0hCGMlHNVnr2CGWPxxDRkRNw3xlyGR3_3XWk	ya29.a0AbVbY6NmXvDhpRAx8rRFR7WPoi22lX-TxZoWcTsXewyQ5I66MYUDb2Xs0yNDvxrwVSkBcGqzP3jXH9DdMdMNmzd3-WgQ-fhp7Ffq3JlFTsuDOr7a2eFQJ2bDcbdkVhYd_DGll4ZcUwdcw2p3yMYitM1wd7E0-8kaCgYKAZ8SARISFQFWKvPliu43AQciCMBzTGR4VLCt3A0166	1689355311	Bearer	https://www.googleapis.com/auth/tagmanager.publish https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/tagmanager.manage.users https://www.googleapis.com/auth/analytics.readonly openid https://www.googleapis.com/auth/tagmanager.readonly https://www.googleapis.com/auth/tagmanager.manage.accounts https://www.googleapis.com/auth/tagmanager.delete.containers https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/tagmanager.edit.containerversions https://www.googleapis.com/auth/userinfo.email	eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3NmRhOWQzMTJjMzlhNDI5OTMyZjU0M2U2YzFiNmU2NTEyZTQ5ODMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc0ODc4NzYzMjU3MTg5NzYzOTAiLCJlbWFpbCI6ImV2YW5kYW5yb3NhQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdF9oYXNoIjoibkM0N0c0SHJFeXZXTl9XNmJCcXpKUSIsIm5hbWUiOiJFdiBSbyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQWNIVHRlbWZMM2lrck5zV1c4YzhTS1dMNkx2Yms0QXdoRURXZjM0RndNSndOSTg9czk2LWMiLCJnaXZlbl9uYW1lIjoiRXYiLCJmYW1pbHlfbmFtZSI6IlJvIiwibG9jYWxlIjoiZW4iLCJpYXQiOjE2ODkzNDM1NDcsImV4cCI6MTY4OTM0NzE0N30.F7pBlKzpw7-s-kFr61XPN5SH_yZtFtiNDA8Eu6pCO5X3uJ1fFyQRkjlZw98KTpDnPulUc2rMtgZhaTkdaBF3UFljUujnjCoVJqPBHwN0m2Qz1xn42Wo9VMAWktbF9CQO3CxrLIYxpo4K9z5EUQhNJyeVaxH5bxskavD9DagGSHhh4QhjROpByznEFig6pTo9DRMklgdwi8-MOb-1HJ7BxW0fvzBXW3eIbJcdvWnQl0APYooS4YHybx8Odbxbf7Ld7qC9JI-VAWOe-62kqwodZ_4FSam8_PcIPB1tB960TxXFh0c7fMWz25s2s-7p2e-1CE5XUKuh_aGA2oOPCcRx1A	\N
929a13e1-3230-4073-b8da-b5885c108930	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	oauth	google	107502973576388589284	1//0djhxqRbFnMKMCgYIARAAGA0SNwF-L9IrK8CIcFPWInEx4EbdsUK4Lv2h64jOfnCVl_W59qtVa12aV8ILSaI7waUA2sg-s2uDaqs	ya29.a0AbVbY6Ox8OS873UuykuLG_cAxIfenXRl5ED689HQD_dkynzFmXIYRBkGAoefkdiJOSRh-W-va8DLGr7HOc1G6qNaOhSJuA3e8QtLyV4Kv7Rjc3M5kBRyw1RvzX30P9ZhCJtXHthiSEXFJb3OMJA0ElraJiPcvbvoaCgYKAY0SARESFQFWKvPlnxwpt2SFntBcd_9UvtrDnA0167	1689469562	Bearer	https://www.googleapis.com/auth/tagmanager.edit.containerversions https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/tagmanager.delete.containers https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/tagmanager.readonly https://www.googleapis.com/auth/tagmanager.manage.accounts openid https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/tagmanager.manage.users https://www.googleapis.com/auth/tagmanager.publish https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/userinfo.profile	eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3NmRhOWQzMTJjMzlhNDI5OTMyZjU0M2U2YzFiNmU2NTEyZTQ5ODMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1MDgyMjYyMjU4OTQtZ2Q2OGpoNW1wZHY5bTZodHF2M2JtdTA2MnRlYnA1cGsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDc1MDI5NzM1NzYzODg1ODkyODQiLCJlbWFpbCI6Im9wdGltYWZsb0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IjM5VDl6dDBXVTl0T1ZsRmxqa2s5U2ciLCJuYW1lIjoiRXZhbiBSb3NhIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FBY0hUdGQ0cEtoZ1B3MnZoVWNydXFHRGlLVmVoVEhlZW52ZDB2cWNCWDZESHJrbHFBPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkV2YW4iLCJmYW1pbHlfbmFtZSI6IlJvc2EiLCJsb2NhbGUiOiJlbiIsImlhdCI6MTY4OTM1Mjk3NCwiZXhwIjoxNjg5MzU2NTc0fQ.O30hyBXqo50vq-hWB9GNPDou9dtsxc0qNs-vqoZ5pI8YI1YkhKy74KxWiqnX7KnjdTQ7HebT_7LIqcpf6zCMNCYVQ7W1zdfP6yd-MsFBeYxUVoLfDBAIT8qHDoQAjWBIyTpk_UTf8Ucwp5OjZSelD_dOA9I2bfSDLkDgh-R_B0e-7h6uENnxA32aeftPpGU8TeOThOI8E4ML1-edXlaT_JKxaJ38Id3K-pBBt-VP1A43uL8cXvA8YZCOGamOZLR56VRIjCzJiS8kGymofJ0j4YhaHEzjcMxLuKovWWevwTuHBQBp2-ps4GeCI_muRQPRXlc-7NmEpuN5pj9Cg8zgtQ	\N
\.


                                                                                                                                                                                                                                                                                                                                                                                                                   3698.dat                                                                                            0000600 0004000 0002000 00000000237 14557242024 0014272 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        cs_test_b1TqsLw6VcpJzt7GFbYj8dpRkAwINSVJQodu4nOsOYqHE6YPBBdtkWgu9h	paid	100	usd	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	50b0cb9a-1ce4-43cf-90ae-e334b6ec0fbf
\.


                                                                                                                                                                                                                                                                                                                                                                 3694.dat                                                                                            0000600 0004000 0002000 00000000277 14557242024 0014272 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        88ab3b8a-cc9b-49ee-8daa-32deaeb6a769	cus_OGJLRaAp5VsINC	8f3472b5-e0a9-4e60-bf3d-495f24e97b8a
9de13375-02b2-462d-b730-de4e36e12f7f	cus_OGMSoCoITeicPP	376e9d86-20e0-4e72-9088-fc1bb6b97d7b
\.


                                                                                                                                                                                                                                                                                                                                 3699.dat                                                                                            0000600 0004000 0002000 00000000277 14557242024 0014277 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        in_1NTpjXJpXmm9uoVNNRpzMA0h	paid	2023-07-14 13:24:47-04	t	100	100	usd	cus_OGMSoCoITeicPP	2023-08-13 13:24:47-04	50b0cb9a-1ce4-43cf-90ae-e334b6ec0fbf	376e9d86-20e0-4e72-9088-fc1bb6b97d7b
\.


                                                                                                                                                                                                                                                                                                                                 3696.dat                                                                                            0000600 0004000 0002000 00000000303 14557242024 0014262 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        price_1NTpgFJpXmm9uoVNX92kIPfp	prod_OGMPKZYwKqtods	t	\N	100	usd	recurring	month	1	0	\N	month	1
price_1NTphaJpXmm9uoVNnau3eI9d	prod_OGMQq1V90whQAz	t	\N	100	usd	recurring	month	1	0	\N	month	1
\.


                                                                                                                                                                                                                                                                                                                             3695.dat                                                                                            0000600 0004000 0002000 00000000152 14557242024 0014263 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        prod_OGMPKZYwKqtods	t	ga4	ga4	\N	\N	1689355284
prod_OGMQq1V90whQAz	t	GTM Tier 1	gtm	\N	\N	1689355366
\.


                                                                                                                                                                                                                                                                                                                                                                                                                      3700.dat                                                                                            0000600 0004000 0002000 00000000145 14557242024 0014250 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        f1e56ec1-ed14-4c92-b066-325622a5029e	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	prod_OGMQq1V90whQAz	t
\.


                                                                                                                                                                                                                                                                                                                                                                                                                           3691.dat                                                                                            0000600 0004000 0002000 00000001355 14557242024 0014265 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        clk4is4na0009oqvadlwlqi7m	92d1ac46-cc03-4af9-a276-45febf876f54	5e690ded-d397-4013-9e05-b4dc9b9aa18f	2023-07-16 01:28:22.918
clk4oevsb0001oql3f17cmjmv	8d97b399-35ce-40fc-862f-089f78528a2f	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	2023-07-16 04:06:02.602
clk4ojrgh0001oqvhusjgzf18	dadf3a0d-2a85-453a-a8ea-d24ede4f49c4	7943ca75-e243-48e4-82f8-942799ec3066	2023-07-16 04:09:50.272
clk2nj4130001oqhyt5ny4mal	0dae4981-7f8b-433a-aa9a-28bf6cb47639	8f3472b5-e0a9-4e60-bf3d-495f24e97b8a	2023-07-14 20:21:52.452
clk2t55y00001oq88cykd2rbz	b3f12ea4-ba06-4e41-b18e-a0c0a3c5d0ee	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	2023-07-14 20:42:54.934
clk2umkom0003oq88zet2k46t	38d50c3f-2253-499e-854e-97e26f374f63	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	2023-07-14 23:54:07.307
\.


                                                                                                                                                                                                                                                                                   3697.dat                                                                                            0000600 0004000 0002000 00000000401 14557242024 0014262 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        50b0cb9a-1ce4-43cf-90ae-e334b6ec0fbf	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	\N	price_1NTphaJpXmm9uoVNnau3eI9d	1	f	2023-07-14 13:24:47-04	2023-07-14 13:24:47-04	2023-08-14 13:24:47-04	\N	\N	\N	\N	\N	prod_OGMQq1V90whQAz	sub_1NTpjXJpXmm9uoVNKFkCyxNx	active
\.


                                                                                                                                                                                                                                                               3692.dat                                                                                            0000600 0004000 0002000 00000001406 14557242024 0014263 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        8f3472b5-e0a9-4e60-bf3d-495f24e97b8a	\N	\N	\N	Ev Ro	evandanrosa@gmail.com	\N	https://lh3.googleusercontent.com/a/AAcHTtemfL3ikrNsWW8c8SKWL6Lvbk4AwhEDWf34FwMJwNI8=s96-c	USER
376e9d86-20e0-4e72-9088-fc1bb6b97d7b	\N	\N	\N	Evan Rosa	optimaflo@gmail.com	\N	https://lh3.googleusercontent.com/a/AAcHTtd4pKhgPw2vhUcruqGDiKVehTHeenvd0vqcBX6DHrklqA=s96-c	USER
929a13e1-3230-4073-b8da-b5885c108930	\N	\N	\N	\N	\N	\N	\N	USER
5e690ded-d397-4013-9e05-b4dc9b9aa18f	\N	\N	\N	Connie Santa	conniesanta51@gmail.com	\N	https://lh3.googleusercontent.com/a/AAcHTte9uPd4jrDTjiCpaurwD53a3eb_27Pu1q09dcYrDhhh=s96-c	USER
7943ca75-e243-48e4-82f8-942799ec3066	\N	\N	\N	ev ro	evro.optimaflo@gmail.com	\N	https://lh3.googleusercontent.com/a/AAcHTtdh6pnVaMBsn_-LpFoRO5AMbUvYhJhs0N_DNgGfJw=s96-c	USER
\.


                                                                                                                                                                                                                                                          3693.dat                                                                                            0000600 0004000 0002000 00000000005 14557242024 0014256 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        \.


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           3689.dat                                                                                            0000600 0004000 0002000 00000012500 14557242024 0014266 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        b43bd7e5-63b4-493f-8c77-f9e1e21e14d7	e0ed00bbde8e15ef3927713b710aa44843e6140849c5cf881725ecee8f704a3b	2023-06-30 09:54:26.684267-04	0_init	\N	\N	2023-06-30 09:54:26.665031-04	1
d59d0dcc-9e0d-49b7-9cb0-1d80af492f6a	f4ffc15eb56d3ae979c0a1ef247b2b163e7e1bed172f6361e2e7595621488e0e	2023-06-30 09:54:26.721793-04	20230522230447_	\N	\N	2023-06-30 09:54:26.719826-04	1
88447186-06db-4f54-b5b2-9fbb73898c8d	62c91d445d2586411efc739746cb8405d74b182d4b66119f4dd3b65ecea8ade7	2023-06-30 09:54:26.686129-04	20230508135144_	\N	\N	2023-06-30 09:54:26.684656-04	1
fe62fbf3-cf61-467b-881c-437b9b103aa6	98153af861fc134248492cf6557ecd74f09765059ff1f91cfce9905e32724d99	2023-06-30 09:54:26.691033-04	20230512013329_checkout_session_2	\N	\N	2023-06-30 09:54:26.686527-04	1
1c8013c5-4c29-4905-93d9-15e0d1bde9ed	633881413cc963c94b6ee02fcd99a4b3529aa025adb226107c974f9190150225	2023-06-30 09:54:26.746606-04	20230614153801_gtm_setting_unique_user_id	\N	\N	2023-06-30 09:54:26.745143-04	1
2742a4f5-7a27-4ed7-b20f-6ba8fadca175	32e71d081266a04260f20492a7181d2e974007de3e80278e8801a70e3ccb6e56	2023-06-30 09:54:26.693239-04	20230512222310_sub_product	\N	\N	2023-06-30 09:54:26.69143-04	1
8635551a-8889-440d-86f7-254491d10f7b	c4d44e4a4648a7befbf32884506234d7da5585175dd2986e73c2f010449b9212	2023-06-30 09:54:26.723909-04	20230523011621_	\N	\N	2023-06-30 09:54:26.722265-04	1
7edd2e65-d8ff-4778-b520-d95ed3562d81	00599cd4b403ea9904677194d6bd3df4d9b03cffa889e40ec0dfa6b608baf231	2023-06-30 09:54:26.69526-04	20230513163719_	\N	\N	2023-06-30 09:54:26.693604-04	1
ecf1dd10-be22-491d-b42a-02b7543da46f	d3706b4ad8e6aeac3181975a3e7cf86698bdfe9c470ff4b9559fafe25b3beab2	2023-06-30 09:54:26.699373-04	20230515154213_invoice	\N	\N	2023-06-30 09:54:26.695734-04	1
47945ab4-d033-40b5-86f0-7e403311122e	13f5a73624c4237047c9cb79c8aad8d2155146559024e1aa94a97cf895093624	2023-06-30 09:54:26.702614-04	20230515155008_invoice_amt_due	\N	\N	2023-06-30 09:54:26.699771-04	1
9f56856f-281f-4c72-b975-6fe175c47001	b192e5c6cc51d1ab991f9370b9970aae8981206a5c0f394b7dd85b161a18a0e4	2023-06-30 09:54:26.7307-04	20230523175325_refactor_invoice	\N	\N	2023-06-30 09:54:26.72433-04	1
869c848d-4079-455e-ae97-f7179f5a2e76	40f087215d679953b732acd536fa57e8b86bcfb0a71e73ceccccd46b8d452208	2023-06-30 09:54:26.706023-04	20230515160652_inv_refactor	\N	\N	2023-06-30 09:54:26.703258-04	1
42a5f626-45f9-4f74-b4c9-2f28f8980a8d	96edfcad219c004435c5d0efef8e0d9c546ba946b2c42e6bacc66d03846a22f4	2023-06-30 09:54:26.70783-04	20230515162342_due_date	\N	\N	2023-06-30 09:54:26.70649-04	1
cf22ae12-d37a-4f28-b0fd-d50598ceccdd	8070137e33ba5ff6da2c1846cf4c84eeb3d119595d784554412946d2cb52a55d	2023-06-30 09:54:26.710169-04	20230516173001_sub_update_id	\N	\N	2023-06-30 09:54:26.708287-04	1
8559b9e0-7ad5-4840-9166-e170c996298b	4092d1f4046bff27bb621955cfab20a546c59d1ceadc4fc7ffad3315c0c6d093	2023-06-30 09:54:26.732333-04	20230528212945_role_user	\N	\N	2023-06-30 09:54:26.731121-04	1
d3955b64-17dd-4d5c-b967-829ff8370a81	bac743c7b09e689deac925de959ac18eda771a78eac0577f3e1a608c94f9afdd	2023-06-30 09:54:26.712332-04	20230516173252_remove_sub_id	\N	\N	2023-06-30 09:54:26.710595-04	1
18c1af46-e2ec-4aa2-a9f8-43fad8af4aac	a095b7f858925464866f6e9e84e09ebae7d9065bfb2151c5089e040a298f951d	2023-06-30 09:54:26.715194-04	20230518155251_invoice	\N	\N	2023-06-30 09:54:26.7128-04	1
2c369083-b6e0-4d58-98a9-a87b09e1b51a	4b8dfbbbba44eaa37cd13a820d31faca109e7dfd06f77a46b7d8898fda9099c7	2023-06-30 09:54:26.75111-04	20230614155205_rename_gtm_setting	\N	\N	2023-06-30 09:54:26.746946-04	1
c1d2c3b8-0752-4f7f-82f0-c1be4b8a0a50	449911e92b512d689a87732881826eb6f00fa9dded4b3aa88ef7370de1b8f27c	2023-06-30 09:54:26.717414-04	20230522173644_init	\N	\N	2023-06-30 09:54:26.715609-04	1
90c2c343-0bd6-47cd-b1fc-c18c333ba6f1	d8d4d45aaf98b89a063923a70e9102e141c0466a0ec7a9d7b800cdcd4a22e152	2023-06-30 09:54:26.733879-04	20230602141755_roles	\N	\N	2023-06-30 09:54:26.732689-04	1
b83220e1-9c33-4a65-bfc9-88cf04130ae1	672c56d7bda14bf778fc989f36e829efbebaae55b4a8dad11724ec8698c8149e	2023-06-30 09:54:26.719338-04	20230522193206_invoice_id_mapping	\N	\N	2023-06-30 09:54:26.717893-04	1
7fb782b1-6caf-47a8-8419-c2242d59b006	d9d61e1d36db971b83b0dceb5709c6ba1c804ed4bcbcc03c929307c84840bdca	2023-06-30 09:54:26.735515-04	20230602145330_	\N	\N	2023-06-30 09:54:26.734291-04	1
ebedb721-efab-409b-9179-c99455917c9e	e73e704be6006c55f870a95fef58bf5b359e1f0c291ac33c98ce9489150bbe70	2023-06-30 09:54:26.737558-04	20230607171137_	\N	\N	2023-06-30 09:54:26.735839-04	1
fea6c03d-b6d2-4474-a99a-772f7e3b5231	cefbf2d038fe58b1db9c2732c780605187a365a8226ea3b136236cff5d30151b	2023-06-30 09:54:26.753757-04	20230614155502_gtmsetting_refactor	\N	\N	2023-06-30 09:54:26.751656-04	1
ec21b8a3-dbf7-40c2-9cf3-f1547356e367	d6d3dc4d58d0ea18460d58cc3852b883e7af18b8e9a4d6c9469f42e1aa8cc109	2023-06-30 09:54:26.741277-04	20230613173612_product_access	\N	\N	2023-06-30 09:54:26.737974-04	1
181811ae-3839-49e0-9769-e372fb761895	07321d54fc771e8af5236aeef6b71254a16cf60c9ea5197c91578d70af73d23d	2023-06-30 09:54:26.744743-04	20230614131505_gtm_setting	\N	\N	2023-06-30 09:54:26.741692-04	1
2ea566f9-81a2-4c76-88ec-8b8e9ed4ceb9	9dae225fa56b4c660f6cf7bb713a2a527e558e4b195cf1e0c1a34267587d33a9	2023-06-30 09:54:26.759027-04	20230614163405_gtm	\N	\N	2023-06-30 09:54:26.75415-04	1
3cb4a304-2f21-4ff9-9dc7-0ea600b86e74	c381104e89258578323d70bf767221075e467b6560802277796765d748ba84df	2023-06-30 09:54:26.761166-04	20230614172301_	\N	\N	2023-06-30 09:54:26.759476-04	1
\.


                                                                                                                                                                                                3701.dat                                                                                            0000600 0004000 0002000 00000000146 14557242024 0014252 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        a7c3cce8-aa42-4bc7-9da2-b608612707fb	376e9d86-20e0-4e72-9088-fc1bb6b97d7b	6131153717	132822068	2
\.


                                                                                                                                                                                                                                                                                                                                                                                                                          restore.sql                                                                                         0000600 0004000 0002000 00000052164 14557242024 0015401 0                                                                                                    ustar 00postgres                        postgres                        0000000 0000000                                                                                                                                                                        --
-- NOTE:
--
-- File paths need to be edited. Search for $$PATH$$ and
-- replace it with the path to the directory containing
-- the extracted data files.
--
--
-- PostgreSQL database dump
--

-- Dumped from database version 14.9 (Homebrew)
-- Dumped by pg_dump version 15.4 (Homebrew)

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

DROP DATABASE optimaflo_local;
--
-- Name: optimaflo_local; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE optimaflo_local WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C';


ALTER DATABASE optimaflo_local OWNER TO postgres;

\connect optimaflo_local

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: evro
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO evro;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: evro
--

COMMENT ON SCHEMA public IS '';


--
-- Name: PricingPlanInterval; Type: TYPE; Schema: public; Owner: evro
--

CREATE TYPE public."PricingPlanInterval" AS ENUM (
    'day',
    'week',
    'month',
    'year'
);


ALTER TYPE public."PricingPlanInterval" OWNER TO evro;

--
-- Name: PricingType; Type: TYPE; Schema: public; Owner: evro
--

CREATE TYPE public."PricingType" AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE public."PricingType" OWNER TO evro;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: evro
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'USER'
);


ALTER TYPE public."Role" OWNER TO evro;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: evro
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO evro;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO evro;

--
-- Name: CheckoutSession; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."CheckoutSession" (
    id text NOT NULL,
    "paymentStatus" text NOT NULL,
    "amountTotal" integer NOT NULL,
    currency text NOT NULL,
    user_id uuid NOT NULL,
    subscription_id text NOT NULL
);


ALTER TABLE public."CheckoutSession" OWNER TO evro;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Customer" (
    id uuid NOT NULL,
    stripe_customer_id text NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public."Customer" OWNER TO evro;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    status text NOT NULL,
    created timestamp with time zone NOT NULL,
    paid boolean NOT NULL,
    amount_due integer NOT NULL,
    amount_paid integer NOT NULL,
    currency text NOT NULL,
    customer_id text NOT NULL,
    due_date timestamp with time zone NOT NULL,
    subscription_id text NOT NULL,
    "userId" uuid
);


ALTER TABLE public."Invoice" OWNER TO evro;

--
-- Name: Price; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Price" (
    id text NOT NULL,
    product_id text NOT NULL,
    active boolean NOT NULL,
    description text,
    unit_amount integer NOT NULL,
    currency text NOT NULL,
    type public."PricingType" NOT NULL,
    "interval" public."PricingPlanInterval" NOT NULL,
    interval_count integer NOT NULL,
    trial_period_days integer NOT NULL,
    metadata jsonb,
    "recurringInterval" text,
    "recurringIntervalCount" integer
);


ALTER TABLE public."Price" OWNER TO evro;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    active boolean NOT NULL,
    name text NOT NULL,
    description text,
    image text,
    metadata jsonb,
    updated integer NOT NULL
);


ALTER TABLE public."Product" OWNER TO evro;

--
-- Name: ProductAccess; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."ProductAccess" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    "productId" text NOT NULL,
    granted boolean DEFAULT false NOT NULL
);


ALTER TABLE public."ProductAccess" OWNER TO evro;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    user_id uuid NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO evro;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    user_id uuid NOT NULL,
    metadata jsonb,
    price_id text NOT NULL,
    quantity integer NOT NULL,
    cancel_at_period_end boolean NOT NULL,
    created timestamp with time zone NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    cancel_at timestamp with time zone,
    canceled_at timestamp with time zone,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    product_id text NOT NULL,
    "subId" text NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'trialing'::public."SubscriptionStatus" NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO evro;

--
-- Name: User; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."User" (
    id uuid NOT NULL,
    "stripeCustomerId" text,
    "subscriptionId" text,
    "subscriptionStatus" text,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL
);


ALTER TABLE public."User" OWNER TO evro;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO evro;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO evro;

--
-- Name: gtm; Type: TABLE; Schema: public; Owner: evro
--

CREATE TABLE public.gtm (
    id text NOT NULL,
    user_id uuid NOT NULL,
    account_id text NOT NULL,
    container_id text NOT NULL,
    workspace_id text NOT NULL
);


ALTER TABLE public.gtm OWNER TO evro;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.
COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM '$$PATH$$/3690.dat';

--
-- Data for Name: CheckoutSession; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."CheckoutSession" (id, "paymentStatus", "amountTotal", currency, user_id, subscription_id) FROM stdin;
\.
COPY public."CheckoutSession" (id, "paymentStatus", "amountTotal", currency, user_id, subscription_id) FROM '$$PATH$$/3698.dat';

--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Customer" (id, stripe_customer_id, user_id) FROM stdin;
\.
COPY public."Customer" (id, stripe_customer_id, user_id) FROM '$$PATH$$/3694.dat';

--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Invoice" (id, status, created, paid, amount_due, amount_paid, currency, customer_id, due_date, subscription_id, "userId") FROM stdin;
\.
COPY public."Invoice" (id, status, created, paid, amount_due, amount_paid, currency, customer_id, due_date, subscription_id, "userId") FROM '$$PATH$$/3699.dat';

--
-- Data for Name: Price; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Price" (id, product_id, active, description, unit_amount, currency, type, "interval", interval_count, trial_period_days, metadata, "recurringInterval", "recurringIntervalCount") FROM stdin;
\.
COPY public."Price" (id, product_id, active, description, unit_amount, currency, type, "interval", interval_count, trial_period_days, metadata, "recurringInterval", "recurringIntervalCount") FROM '$$PATH$$/3696.dat';

--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Product" (id, active, name, description, image, metadata, updated) FROM stdin;
\.
COPY public."Product" (id, active, name, description, image, metadata, updated) FROM '$$PATH$$/3695.dat';

--
-- Data for Name: ProductAccess; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."ProductAccess" (id, "userId", "productId", granted) FROM stdin;
\.
COPY public."ProductAccess" (id, "userId", "productId", granted) FROM '$$PATH$$/3700.dat';

--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Session" (id, "sessionToken", user_id, expires) FROM stdin;
\.
COPY public."Session" (id, "sessionToken", user_id, expires) FROM '$$PATH$$/3691.dat';

--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."Subscription" (id, user_id, metadata, price_id, quantity, cancel_at_period_end, created, current_period_start, current_period_end, ended_at, cancel_at, canceled_at, trial_start, trial_end, product_id, "subId", status) FROM stdin;
\.
COPY public."Subscription" (id, user_id, metadata, price_id, quantity, cancel_at_period_end, created, current_period_start, current_period_end, ended_at, cancel_at, canceled_at, trial_start, trial_end, product_id, "subId", status) FROM '$$PATH$$/3697.dat';

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."User" (id, "stripeCustomerId", "subscriptionId", "subscriptionStatus", name, email, "emailVerified", image, role) FROM stdin;
\.
COPY public."User" (id, "stripeCustomerId", "subscriptionId", "subscriptionStatus", name, email, "emailVerified", image, role) FROM '$$PATH$$/3692.dat';

--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.
COPY public."VerificationToken" (identifier, token, expires) FROM '$$PATH$$/3693.dat';

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.
COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM '$$PATH$$/3689.dat';

--
-- Data for Name: gtm; Type: TABLE DATA; Schema: public; Owner: evro
--

COPY public.gtm (id, user_id, account_id, container_id, workspace_id) FROM stdin;
\.
COPY public.gtm (id, user_id, account_id, container_id, workspace_id) FROM '$$PATH$$/3701.dat';

--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: CheckoutSession CheckoutSession_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: Price Price_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Price"
    ADD CONSTRAINT "Price_pkey" PRIMARY KEY (id);


--
-- Name: ProductAccess ProductAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."ProductAccess"
    ADD CONSTRAINT "ProductAccess_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: gtm gtm_pkey; Type: CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public.gtm
    ADD CONSTRAINT gtm_pkey PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Customer_stripe_customer_id_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "Customer_stripe_customer_id_key" ON public."Customer" USING btree (stripe_customer_id);


--
-- Name: ProductAccess_userId_productId_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "ProductAccess_userId_productId_key" ON public."ProductAccess" USING btree ("userId", "productId");


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: Subscription_subId_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "Subscription_subId_key" ON public."Subscription" USING btree ("subId");


--
-- Name: Subscription_user_id_product_id_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "Subscription_user_id_product_id_key" ON public."Subscription" USING btree (user_id, product_id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_stripeCustomerId_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON public."User" USING btree ("stripeCustomerId");


--
-- Name: User_subscriptionId_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "User_subscriptionId_key" ON public."User" USING btree ("subscriptionId");


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: evro
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: gtmSettingsUserId; Type: INDEX; Schema: public; Owner: evro
--

CREATE INDEX "gtmSettingsUserId" ON public.gtm USING btree (user_id);


--
-- Name: subscriptionId; Type: INDEX; Schema: public; Owner: evro
--

CREATE INDEX "subscriptionId" ON public."CheckoutSession" USING btree (subscription_id);


--
-- Name: userId; Type: INDEX; Schema: public; Owner: evro
--

CREATE INDEX "userId" ON public."CheckoutSession" USING btree (user_id);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CheckoutSession CheckoutSession_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CheckoutSession CheckoutSession_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Customer Customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public."Customer"(stripe_customer_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Price Price_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Price"
    ADD CONSTRAINT "Price_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductAccess ProductAccess_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."ProductAccess"
    ADD CONSTRAINT "ProductAccess_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductAccess ProductAccess_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."ProductAccess"
    ADD CONSTRAINT "ProductAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subscription Subscription_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_price_id_fkey" FOREIGN KEY (price_id) REFERENCES public."Price"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subscription Subscription_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subscription Subscription_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: gtm gtm_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: evro
--

ALTER TABLE ONLY public.gtm
    ADD CONSTRAINT gtm_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DATABASE optimaflo_local; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON DATABASE optimaflo_local TO evro;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: evro
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            