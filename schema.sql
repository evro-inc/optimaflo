

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


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."PricingPlanInterval" AS ENUM (
    'day',
    'week',
    'month',
    'year'
);


ALTER TYPE "public"."PricingPlanInterval" OWNER TO "postgres";


CREATE TYPE "public"."PricingType" AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE "public"."PricingType" OWNER TO "postgres";


CREATE TYPE "public"."Role" AS ENUM (
    'ADMIN',
    'USER'
);


ALTER TYPE "public"."Role" OWNER TO "postgres";


CREATE TYPE "public"."SubscriptionStatus" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE "public"."SubscriptionStatus" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."CheckoutSession" (
    "id" "text" NOT NULL,
    "paymentStatus" "text" NOT NULL,
    "amountTotal" integer NOT NULL,
    "currency" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "subscription_id" "text" NOT NULL
);


ALTER TABLE "public"."CheckoutSession" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Customer" (
    "id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "user_id" "text" NOT NULL
);


ALTER TABLE "public"."Customer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Feature" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."Feature" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Invoice" (
    "id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created" timestamp with time zone NOT NULL,
    "paid" boolean NOT NULL,
    "amount_due" integer NOT NULL,
    "amount_paid" integer NOT NULL,
    "currency" "text" NOT NULL,
    "customer_id" "text" NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "subscription_id" "text" NOT NULL,
    "user_id" "text"
);


ALTER TABLE "public"."Invoice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Price" (
    "id" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "active" boolean NOT NULL,
    "description" "text",
    "unit_amount" integer NOT NULL,
    "currency" "text" NOT NULL,
    "type" "public"."PricingType" NOT NULL,
    "interval" "public"."PricingPlanInterval" NOT NULL,
    "interval_count" integer NOT NULL,
    "trial_period_days" integer NOT NULL,
    "metadata" "jsonb",
    "recurringInterval" "text",
    "recurringIntervalCount" integer
);


ALTER TABLE "public"."Price" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Product" (
    "id" "text" NOT NULL,
    "active" boolean NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "metadata" "jsonb",
    "updated" integer NOT NULL
);


ALTER TABLE "public"."Product" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ProductAccess" (
    "id" "text" NOT NULL,
    "productId" "text" NOT NULL,
    "granted" boolean DEFAULT false NOT NULL,
    "user_id" "text"
);


ALTER TABLE "public"."ProductAccess" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" "text" NOT NULL,
    "user_id" "text",
    "abandonAt" bigint,
    "clientId" "text",
    "createdAt" bigint NOT NULL,
    "expireAt" bigint NOT NULL,
    "lastActiveAt" bigint NOT NULL,
    "status" "text",
    "updatedAt" bigint NOT NULL
);


ALTER TABLE "public"."Session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Subscription" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "metadata" "jsonb",
    "price_id" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "cancel_at_period_end" boolean NOT NULL,
    "created" timestamp with time zone NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "product_id" "text" NOT NULL,
    "subId" "text" NOT NULL,
    "status" "public"."SubscriptionStatus" DEFAULT 'trialing'::"public"."SubscriptionStatus" NOT NULL
);


ALTER TABLE "public"."Subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TierFeatureLimit" (
    "id" "text" NOT NULL,
    "createLimit" integer DEFAULT 0 NOT NULL,
    "updateLimit" integer DEFAULT 0 NOT NULL,
    "deleteLimit" integer DEFAULT 0 NOT NULL,
    "feature_id" "text" NOT NULL,
    "product_id" "text" NOT NULL
);


ALTER TABLE "public"."TierFeatureLimit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TierLimit" (
    "id" "text" NOT NULL,
    "productId" "text" NOT NULL,
    "featureId" "text" NOT NULL,
    "subscriptionId" "text",
    "createLimit" integer DEFAULT 0 NOT NULL,
    "updateLimit" integer DEFAULT 0 NOT NULL,
    "createUsage" integer DEFAULT 0 NOT NULL,
    "updateUsage" integer DEFAULT 0 NOT NULL,
    "deleteLimit" integer DEFAULT 0 NOT NULL,
    "deleteUsage" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."TierLimit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "stripeCustomerId" "text",
    "subscriptionId" "text",
    "subscriptionStatus" "text",
    "name" "text",
    "email" "text",
    "emailVerified" timestamp(3) without time zone,
    "image" "text",
    "role" "public"."Role" DEFAULT 'USER'::"public"."Role" NOT NULL
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ga" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "account_id" "text" NOT NULL,
    "property_id" "text" NOT NULL
);


ALTER TABLE "public"."ga" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gtm" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "account_id" "text" NOT NULL,
    "container_id" "text" NOT NULL,
    "workspace_id" "text" NOT NULL
);


ALTER TABLE "public"."gtm" OWNER TO "postgres";


ALTER TABLE ONLY "public"."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Feature"
    ADD CONSTRAINT "Feature_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Price"
    ADD CONSTRAINT "Price_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProductAccess"
    ADD CONSTRAINT "ProductAccess_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TierFeatureLimit"
    ADD CONSTRAINT "TierFeatureLimit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TierLimit"
    ADD CONSTRAINT "TierLimit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ga"
    ADD CONSTRAINT "ga_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gtm"
    ADD CONSTRAINT "gtm_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "Customer_stripe_customer_id_key" ON "public"."Customer" USING "btree" ("stripe_customer_id");



CREATE UNIQUE INDEX "Feature_name_key" ON "public"."Feature" USING "btree" ("name");



CREATE UNIQUE INDEX "ProductAccess_user_id_productId_key" ON "public"."ProductAccess" USING "btree" ("user_id", "productId");



CREATE UNIQUE INDEX "Subscription_subId_key" ON "public"."Subscription" USING "btree" ("subId");



CREATE UNIQUE INDEX "Subscription_user_id_product_id_key" ON "public"."Subscription" USING "btree" ("user_id", "product_id");



CREATE UNIQUE INDEX "TierFeatureLimit_product_id_feature_id_key" ON "public"."TierFeatureLimit" USING "btree" ("product_id", "feature_id");



CREATE UNIQUE INDEX "TierLimit_subscriptionId_featureId_key" ON "public"."TierLimit" USING "btree" ("subscriptionId", "featureId");



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "public"."User" USING "btree" ("stripeCustomerId");



CREATE UNIQUE INDEX "User_subscriptionId_key" ON "public"."User" USING "btree" ("subscriptionId");



CREATE INDEX "gaSettingsUserId" ON "public"."ga" USING "btree" ("user_id");



CREATE UNIQUE INDEX "ga_user_id_account_id_property_id_key" ON "public"."ga" USING "btree" ("user_id", "account_id", "property_id");



CREATE INDEX "gtmSettingsUserId" ON "public"."gtm" USING "btree" ("user_id");



CREATE UNIQUE INDEX "gtm_user_id_account_id_container_id_workspace_id_key" ON "public"."gtm" USING "btree" ("user_id", "account_id", "container_id", "workspace_id");



CREATE INDEX "subscriptionId" ON "public"."CheckoutSession" USING "btree" ("subscription_id");



CREATE INDEX "userId" ON "public"."CheckoutSession" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."Subscription"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."CheckoutSession"
    ADD CONSTRAINT "CheckoutSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Customer"
    ADD CONSTRAINT "Customer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."Customer"("stripe_customer_id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."Subscription"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Price"
    ADD CONSTRAINT "Price_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ProductAccess"
    ADD CONSTRAINT "ProductAccess_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ProductAccess"
    ADD CONSTRAINT "ProductAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "public"."Price"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Subscription"
    ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."TierFeatureLimit"
    ADD CONSTRAINT "TierFeatureLimit_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."Feature"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."TierFeatureLimit"
    ADD CONSTRAINT "TierFeatureLimit_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."TierLimit"
    ADD CONSTRAINT "TierLimit_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."Feature"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."TierLimit"
    ADD CONSTRAINT "TierLimit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."TierLimit"
    ADD CONSTRAINT "TierLimit_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ga"
    ADD CONSTRAINT "ga_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."gtm"
    ADD CONSTRAINT "gtm_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;







































































































































































































































RESET ALL;
