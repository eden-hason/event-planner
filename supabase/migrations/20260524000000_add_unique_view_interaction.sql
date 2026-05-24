CREATE UNIQUE INDEX idx_guest_interactions_unique_view
  ON guest_interactions (guest_id, schedule_id)
  WHERE interaction_type = 'view';
