import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
    apiVersion: "2025-08-27.basil" 
  });

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event: Stripe.Event;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log("Webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { type, referenceId, userId } = session.metadata || {};
      const paymentIntentId = session.payment_intent as string;

      console.log("Processing payment for:", { type, referenceId, userId });

      switch (type) {
        case 'order':
          // Get the order and its cart
          const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('*, cart_id')
            .eq('id', referenceId)
            .single();

          if (orderError) {
            console.error("Order not found:", orderError);
            throw orderError;
          }

          // Get cart items
          const { data: cartItems, error: cartError } = await supabaseClient
            .from('cart_items')
            .select('*')
            .eq('cart_id', order.cart_id);

          if (cartError) {
            console.error("Cart items not found:", cartError);
            throw cartError;
          }

          // Create order items
          const orderItems = cartItems.map(item => ({
            order_id: referenceId,
            menu_item_id: item.menu_item_id,
            name: item.name,
            qty: item.qty,
            unit_price: item.unit_price,
            line_total: item.line_total
          }));

          const { error: itemsError } = await supabaseClient
            .from('order_items')
            .insert(orderItems);

          if (itemsError) {
            console.error("Failed to create order items:", itemsError);
            throw itemsError;
          }

          // Update order status
          const { error: updateOrderError } = await supabaseClient
            .from('orders')
            .update({ 
              payment_status: 'paid',
              payment_method: session.payment_method_types?.[0] || 'card',
              status: 'new'
            })
            .eq('id', referenceId);

          if (updateOrderError) {
            console.error("Failed to update order:", updateOrderError);
            throw updateOrderError;
          }

          // Mark cart as completed
          await supabaseClient
            .from('carts')
            .update({ status: 'completed' })
            .eq('id', order.cart_id);

          console.log("Order completed successfully:", referenceId);
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

          console.log("Booking confirmed:", referenceId);
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

          console.log("Event registration confirmed:", referenceId);
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

          console.log("Party request confirmed:", referenceId);
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
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
