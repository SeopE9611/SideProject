// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwzpxxahtayoyqqskmnt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3enB4eGFodGF5b3lxcXNrbW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NjUwOTcsImV4cCI6MjA2MjM0MTA5N30.g7N29tIwqZ5Jq4djjkZZvgWHzVP0ROrdPCtlHsYpNsE';

export const supabase = createClient(supabaseUrl, supabaseKey);
