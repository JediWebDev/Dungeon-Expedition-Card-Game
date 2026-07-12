CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_address_user_id_idx" ON "wallet_address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "equipment_item_guild_id_idx" ON "equipment_item" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "equipment_item_equipped_hero_id_idx" ON "equipment_item" USING btree ("equipped_hero_id");--> statement-breakpoint
CREATE INDEX "expedition_guild_id_idx" ON "expedition" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "hero_guild_id_idx" ON "hero" USING btree ("guild_id");