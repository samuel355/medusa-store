import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260809140148 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create schema if not exists "medusastore";`);
    this.addSql(`create table if not exists "medusastore"."review" ("id" text not null, "rating" integer not null, "body" text not null, "status" text check ("status" in ('pending', 'approved', 'hidden')) not null default 'pending', "product_id" text not null, "customer_id" text not null, "customer_name" text not null, "order_id" text not null, "order_item_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "medusastore"."review" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "medusastore"."review" cascade;`);

    this.addSql(`drop schema if exists "medusastore";`);
  }

}
