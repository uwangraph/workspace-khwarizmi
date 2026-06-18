-- Function to clear all messages in a chat room
-- Uses SECURITY DEFINER so it bypasses RLS, but checks participant membership first
CREATE OR REPLACE FUNCTION clear_chat_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow participants of the room to clear it
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to clear this chat room';
  END IF;

  DELETE FROM chat_messages WHERE room_id = p_room_id;
END;
$$;
