import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    const { type, referenceId, userId } = session.metadata || {};
    const paymentIntentId = session.payment_intent as string;

    // Update the appropriate table based on type
    switch (type) {
      case 'order':
        await supabaseClient
          .from('orders')
          .update({ 
            payment_status: 'paid',
            payment_method: session.payment_method_types?.[0] || 'card',
            status: 'new'
          })
          .eq('id', referenceId);
        break;
        
      case 'booking':
        await supabaseClient
          .from('room_bookings')
          .update({ 
            payment_status: 'paid',
            payment_method: session.payment_method_types?.[0] || 'card',
            stripe_payment_id: paymentIntentId,
            status: 'confirmed'
          })
          .eq('id', referenceId);
        break;
        
      case 'event':
        await supabaseClient
          .from('event_registrations')
          .update({ 
            payment_status: 'paid',
            payment_method: session.payment_method_types?.[0] || 'card',
            stripe_payment_id: paymentIntentId,
            amount_paid: session.amount_total ? session.amount_total / 100 : 0,
            status: 'confirmed'
          })
          .eq('id', referenceId);
        break;
        
      case 'party':
        await supabaseClient
          .from('party_requests')
          .update({ 
            payment_status: 'paid',
            payment_method: session.payment_method_types?.[0] || 'card',
            stripe_payment_id: paymentIntentId,
            status: 'confirmed'
          })
          .eq('id', referenceId);
        break;
    }

    // Save payment method if it was used
    if (session.payment_method && userId) {
      const paymentMethod = await stripe.paymentMethods.retrieve(session.payment_method as string);
      
      await supabaseClient
        .from('saved_cards')
        .upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_payment_method_id: paymentMethod.id,
          card_brand: paymentMethod.card?.brand || 'unknown',
          card_last4: paymentMethod.card?.last4 || '0000',
          card_exp_month: paymentMethod.card?.exp_month || 1,
          card_exp_year: paymentMethod.card?.exp_year || 2099,
        }, {
          onConflict: 'stripe_payment_method_id'
        });
    }

    return new Response(JSON.stringify({ success: true, type, referenceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
