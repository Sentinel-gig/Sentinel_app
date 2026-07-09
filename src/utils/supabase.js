import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://blurdndipqtyxeiljkel.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_beAtYqxIz2ZQcmtB4BKD1A_jSdwb7fu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
