-- Add Magic / Resist attributes for the expanded character sheet.
ALTER TABLE hero ADD COLUMN IF NOT EXISTS magic integer NOT NULL DEFAULT 0;
ALTER TABLE hero ADD COLUMN IF NOT EXISTS resist integer NOT NULL DEFAULT 0;

-- Remap legacy equipment slot names onto the paperdoll slots.
UPDATE equipment_item SET type = 'mainHand', equip_slot = 'mainHand'
  WHERE type = 'weapon' OR equip_slot = 'weapon';

UPDATE equipment_item SET type = 'chest', equip_slot = 'chest'
  WHERE type = 'armor' OR equip_slot = 'armor';

UPDATE equipment_item SET type = 'ring', equip_slot = 'ring'
  WHERE type = 'accessory' OR equip_slot = 'accessory';

-- Seed class-appropriate magic/resist for existing heroes that still have zeros.
UPDATE hero SET magic = 4, resist = 6 WHERE hero_class = 'Warrior' AND magic = 0 AND resist = 0;
UPDATE hero SET magic = 5, resist = 4 WHERE hero_class = 'Rogue' AND magic = 0 AND resist = 0;
UPDATE hero SET magic = 20, resist = 10 WHERE hero_class = 'Mage' AND magic = 0 AND resist = 0;
UPDATE hero SET magic = 14, resist = 12 WHERE hero_class = 'Cleric' AND magic = 0 AND resist = 0;
