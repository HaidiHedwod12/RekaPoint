/*
  # Add User Context Function for RLS

  1. Functions
    - Create function to set current user context
    - Helper functions for RLS policies

  2. Security
    - Proper user context for database operations
*/

-- Create function to set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = get_current_user_id() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check aktivitas access
CREATE OR REPLACE FUNCTION can_access_aktivitas(aktivitas_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    aktivitas_user_id = get_current_user_id() OR
    is_admin()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;