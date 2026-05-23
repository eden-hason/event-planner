ALTER TABLE profiles DROP COLUMN can_create_schedules;
ALTER TABLE events ADD COLUMN can_create_schedules boolean NOT NULL DEFAULT false;
