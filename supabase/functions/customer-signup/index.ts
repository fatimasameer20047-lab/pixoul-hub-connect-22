import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, password, name } = await req.json();

    // Create user account
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (signUpError) {
      throw signUpError;
    }

    // Create customer profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userData.user.id,
        full_name: name,
        role: 'customer'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully',
        user: userData.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Customer signup error:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'An error occurred during signup' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});