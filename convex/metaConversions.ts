"use node";

import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'crypto';

export const trackPurchase = internalAction({
  args: {
    email: v.string(),
    value: v.number(),
    transactionId: v.string(),
    productName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = process.env.META_CONVERSIONS_TOKEN;
    const pixelId = '705462081984189';
    
    if (!token) {
      console.error('META_CONVERSIONS_TOKEN não configurado');
      return;
    }

    const hashedEmail = crypto
      .createHash('sha256')
      .update(args.email.toLowerCase().trim())
      .digest('hex');

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Purchase',
                event_time: Math.floor(Date.now() / 1000),
                event_id: args.transactionId,
                event_source_url: 'https://jornada-com-deus.pages.dev/vendas.html',
                user_data: {
                  em: hashedEmail,
                },
                custom_data: {
                  value: args.value,
                  currency: 'BRL',
                  content_name: args.productName,
                },
              },
            ],
          }),
        }
      );

      const result = await response.json();
      console.log('Meta Conversions API response:', result);
      return { success: true, result };
    } catch (error) {
      console.error('Erro ao rastrear compra no Meta:', error);
      return { success: false, error: String(error) };
    }
  },
});
